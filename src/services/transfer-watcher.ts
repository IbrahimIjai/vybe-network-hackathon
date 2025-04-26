import { VybeApi } from "../api/vybe";
import { TransferNotification } from "../types/realtime";
import { TokenTransfer } from "../types/api";
import { EventEmitter } from "events";
import { FormatUtils } from "../utils/format";

export class TransferWatcherService extends EventEmitter {
	private walletSubscriptions: Map<string, Set<number>> = new Map();
	private lastCheckedTime: Map<string, number> = new Map();
	private pollingInterval: NodeJS.Timeout | null = null;
	private readonly POLLING_FREQUENCY = 60000; // Poll every minute

	constructor() {
		super();
		this.startPolling();
	}

	public subscribeWallet(walletAddress: string, chatId: number): boolean {
		try {
			if (
				!walletAddress ||
				!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)
			) {
				return false;
			}

			const normalizedAddress = walletAddress.trim();

			// Add to subscriptions map
			if (!this.walletSubscriptions.has(normalizedAddress)) {
				this.walletSubscriptions.set(normalizedAddress, new Set());
				this.lastCheckedTime.set(
					normalizedAddress,
					Math.floor(Date.now() / 1000) - 3600,
				); // Start checking from 1 hour ago
			}

			this.walletSubscriptions.get(normalizedAddress)!.add(chatId);
			return true;
		} catch (error) {
			console.error("Error subscribing wallet:", error);
			return false;
		}
	}

	/**
	 * Unsubscribe a chat from a wallet's notifications
	 */
	public unsubscribeWallet(walletAddress: string, chatId: number): boolean {
		try {
			// Normalize wallet address
			const normalizedAddress = walletAddress.trim();

			// Remove from subscriptions map
			if (this.walletSubscriptions.has(normalizedAddress)) {
				const subscriptions = this.walletSubscriptions.get(normalizedAddress);

				if (subscriptions) {
					subscriptions.delete(chatId);

					// If no more subscriptions for this wallet, remove it completely
					if (subscriptions.size === 0) {
						this.walletSubscriptions.delete(normalizedAddress);
						this.lastCheckedTime.delete(normalizedAddress);
					}

					return true;
				}
			}

			return false;
		} catch (error) {
			console.error("Error unsubscribing wallet:", error);
			return false;
		}
	}

	/**
	 * Get all wallets subscribed by a chat
	 */
	public getSubscribedWallets(chatId: number): string[] {
		const subscribedWallets: string[] = [];

		this.walletSubscriptions.forEach((chatIds, wallet) => {
			if (chatIds.has(chatId)) {
				subscribedWallets.push(wallet);
			}
		});

		return subscribedWallets;
	}

	/**
	 * Start polling for new transfers
	 */
	private startPolling(): void {
		if (this.pollingInterval) {
			clearInterval(this.pollingInterval);
		}

		this.pollingInterval = setInterval(async () => {
			await this.checkForNewTransfers();
		}, this.POLLING_FREQUENCY);

		console.log("Transfer watcher polling started");
	}

	/**
	 * Stop polling for new transfers
	 */
	public stopPolling(): void {
		if (this.pollingInterval) {
			clearInterval(this.pollingInterval);
			this.pollingInterval = null;
			console.log("Transfer watcher polling stopped");
		}
	}

	/**
	 * Check for new transfers for all subscribed wallets
	 */
	private async checkForNewTransfers(): Promise<void> {
		try {
			const wallets = Array.from(this.walletSubscriptions.keys());

			for (const wallet of wallets) {
				const lastChecked = this.lastCheckedTime.get(wallet) || 0;
				await this.checkWalletTransfers(wallet, lastChecked);
			}
		} catch (error) {
			console.error("Error checking for new transfers:", error);
		}
	}

	/**
	 * Check for new transfers for a specific wallet
	 */
	private async checkWalletTransfers(
		walletAddress: string,
		fromTimestamp: number,
	): Promise<void> {
		try {
			// Get recent transfers for the wallet
			const transfers = await VybeApi.getWalletTransfers(
				walletAddress,
				fromTimestamp,
			);

			if (!transfers || transfers.length === 0) {
				return;
			}

			// Update last checked time to the latest transfer
			const newestTimestamp = Math.max(...transfers.map((t) => t.blockTime));
			this.lastCheckedTime.set(walletAddress, newestTimestamp);

			// Process each transfer
			for (const transfer of transfers) {
				this.processTransfer(walletAddress, transfer);
			}
		} catch (error) {
			console.error(
				`Error checking transfers for wallet ${walletAddress}:`,
				error,
			);
		}
	}

	/**
	 * Process a transfer and notify subscribed chats
	 */
	private processTransfer(
		walletAddress: string,
		transfer: TokenTransfer,
	): void {
		try {
			// Create notification object
			const notification: TransferNotification = {
				walletAddress,
				transfer: {
					signature: transfer.signature,
					from: transfer.sender,
					to: transfer.receiver,
					amount: FormatUtils.formatCurrency(
						Number(transfer.amount),
						// transfer.decimals,
					),
					symbol: transfer.tokenSymbol,
					usdValue: transfer.usdAmount,
					timestamp: transfer.blockTime,
				},
			};

			// Get subscribed chats
			const subscribedChats = this.walletSubscriptions.get(walletAddress);

			if (subscribedChats && subscribedChats.size > 0) {
				// Emit transfer notification event
				this.emit(
					"transferNotification",
					notification,
					Array.from(subscribedChats),
				);
			}
		} catch (error) {
			console.error("Error processing transfer:", error);
		}
	}

	/**
	 * Manually check a wallet for recent transfers
	 */
	public async manualCheck(walletAddress: string): Promise<TokenTransfer[]> {
		try {
			// Get recent transfers (last hour)
			const fromTimestamp = Math.floor(Date.now() / 1000) - 3600;
			const transfers = await VybeApi.getWalletTransfers(
				walletAddress,
				fromTimestamp,
			);
			return transfers || [];
		} catch (error) {
			console.error(`Error manually checking wallet ${walletAddress}:`, error);
			return [];
		}
	}
}

// Export singleton instance
export const transferWatcherService = new TransferWatcherService();
