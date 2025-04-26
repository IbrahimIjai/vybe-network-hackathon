import { bot } from "../index";
import { transferWatcherService } from "../services/transfer-watcher";
import { TransferNotification } from "../types/realtime";
import { FormatUtils } from "../utils/format";
import { MessageUtils } from "../utils/message";

/**
 * WalletMonitorService processes transfer notifications and sends them to users
 */
export class WalletMonitorService {
	private static instance: WalletMonitorService;

	private constructor() {
		this.initialize();
	}

	public static getInstance(): WalletMonitorService {
		if (!WalletMonitorService.instance) {
			WalletMonitorService.instance = new WalletMonitorService();
		}
		return WalletMonitorService.instance;
	}

	/**
	 * Initialize the service and set up listeners
	 */
	private initialize(): void {
		// Listen for transfer notifications from the watcher service
		transferWatcherService.on(
			"transferNotification",
			(notification: TransferNotification, chatIds: number[]) => {
				this.handleTransferNotification(notification, chatIds);
			},
		);

		console.log("Wallet monitor service initialized");
	}

	/**
	 * Handle a transfer notification event
	 */
	private async handleTransferNotification(
		notification: TransferNotification,
		chatIds: number[],
	): Promise<void> {
		try {
			if (!chatIds || chatIds.length === 0) {
				return;
			}

			// Create notification message
			const message = this.formatTransferMessage(notification);

			// Send notification to each chat
			for (const chatId of chatIds) {
				try {
					await bot.api.sendMessage(chatId, message, {
						parse_mode: "Markdown",
					});
				} catch (error) {
					console.error(
						`Error sending transfer notification to chat ${chatId}:`,
						error,
					);
				}
			}
		} catch (error) {
			console.error("Error handling transfer notification:", error);
		}
	}

	/**
	 * Format a transfer notification into a readable message
	 */
	private formatTransferMessage(notification: TransferNotification): string {
		const { walletAddress, transfer } = notification;
		const { signature, from, to, amount, symbol, usdValue, timestamp } =
			transfer;

		// Determine if the tracked wallet is sender or receiver
		const isSender = from === walletAddress;
		const direction = isSender ? "Out" : "In";
		const emoji = isSender ? "↗️" : "↘️";

		// Format the message
		const message =
			`${emoji} *${direction} Transfer Detected*\n\n` +
			`*Token:* ${symbol}\n` +
			`*Amount:* ${amount} ${symbol} (${FormatUtils.formatCurrency(
				usdValue,
			)})\n` +
			`*From:* \`${FormatUtils.truncateAddress(from)}\`\n` +
			`*To:* \`${FormatUtils.truncateAddress(to)}\`\n` +
			`*Time:* ${FormatUtils.formatRelativeTime(timestamp)}\n\n` +
			`[View Transaction](${MessageUtils.createAlphaVybeUrl(signature)})`;

		return message;
	}
}

// Initialize the service as a singleton
export const walletMonitorService = WalletMonitorService.getInstance();
