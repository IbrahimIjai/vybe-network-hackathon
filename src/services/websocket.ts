import { WebSocket } from "ws";
import { redisService } from "./redis";
import { FormatUtils } from "../utils/format";
import { VybeApi } from "../api/vybe";
import { Bot } from "grammy";
import { MyContext } from "../types/session";
import config from "../config";
const bot = new Bot<MyContext>(config.BOT_TOKEN);

interface TokenTransferMessage {
	type: string;
	wallet: string;
	amount: string;
	token: string;
	timestamp: number;
}

interface SubscriptionMessage {
	type: string;
	wallet: string;
	userId: string;
}

class WebSocketService {
	private ws: WebSocket | null = null;
	private subscriptions: Map<string, Set<string>> = new Map(); // wallet -> Set<userId>
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 5000; // 5 seconds
	private readonly wsUrl = "wss://api.vybe.network/ws";

	constructor() {
		this.connect();
	}

	/**
	 * Establishes a connection to the WebSocket server
	 */
	private connect(): void {
		try {
			this.ws = new WebSocket(this.wsUrl);
			this.setupEventListeners();
		} catch (error) {
			console.error("Error connecting to WebSocket:", error);
			this.handleReconnect();
		}
	}

	/**
	 * Sets up WebSocket event listeners
	 */
	private setupEventListeners(): void {
		if (!this.ws) return;

		this.ws.on("open", this.handleOpen.bind(this));
		this.ws.on("message", this.handleMessage.bind(this));
		this.ws.on("close", this.handleClose.bind(this));
		this.ws.on("error", this.handleError.bind(this));
	}

	/**
	 * Handles WebSocket open event
	 */
	private handleOpen(): void {
		console.log("WebSocket connected");
		this.reconnectAttempts = 0;
		this.resubscribeAll();
	}

	/**
	 * Handles WebSocket message event
	 */
	private async handleMessage(data: string): Promise<void> {
		try {
			const message = JSON.parse(data);
			if (message.type === "token_transfer") {
				await this.handleTokenTransfer(message as TokenTransferMessage);
			}
		} catch (error) {
			console.error("Error processing WebSocket message:", error);
		}
	}

	/**
	 * Handles WebSocket close event
	 */
	private handleClose(): void {
		console.log("WebSocket disconnected");
		this.handleReconnect();
	}

	/**
	 * Handles WebSocket error event
	 */
	private handleError(error: Error): void {
		console.error("WebSocket error:", error);
		this.handleReconnect();
	}

	/**
	 * Manages reconnection attempts
	 */
	private handleReconnect(): void {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			console.log(
				`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
			);
			setTimeout(() => this.connect(), this.reconnectDelay);
		} else {
			console.error("Max reconnection attempts reached");
		}
	}

	/**
	 * Resubscribes to all previously subscribed wallets
	 */
	private async resubscribeAll(): Promise<void> {
		for (const [wallet, userIds] of this.subscriptions) {
			for (const userId of userIds) {
				await this.subscribeToWallet(wallet, userId);
			}
		}
	}

	/**
	 * Sends a subscription message for a specific wallet and user
	 */
	private async subscribeToWallet(
		walletAddress: string,
		userId: string,
	): Promise<void> {
		if (!this.isConnected()) {
			throw new Error("WebSocket is not connected");
		}

		const subscription: SubscriptionMessage = {
			type: "subscribe",
			wallet: walletAddress,
			userId: userId,
		};

		this.ws!.send(JSON.stringify(subscription));
	}

	/**
	 * Checks if WebSocket is connected and ready
	 */
	private isConnected(): boolean {
		return !!this.ws && this.ws.readyState === WebSocket.OPEN;
	}

	/**
	 * Processes token transfer notifications and sends them to subscribers
	 */
	private async handleTokenTransfer(
		message: TokenTransferMessage,
	): Promise<void> {
		const { wallet, amount, token, timestamp } = message;
		const subscribers = await redisService.getWalletSubscribers(wallet);

		for (const userId of subscribers) {
			try {
				const notification = this.formatTransferNotification(
					wallet,
					amount,
					token,
					timestamp,
				);
				await this.sendNotification(userId, notification);
			} catch (error) {
				console.error(`Error sending notification to user ${userId}:`, error);
			}
		}
	}

	/**
	 * Formats a token transfer notification message
	 */
	private formatTransferNotification(
		wallet: string,
		amount: string,
		token: string,
		timestamp: number,
	): string {
		return (
			`🔔 Token Transfer Alert!\n\n` +
			`Wallet: ${wallet}\n` +
			`Amount: ${amount} ${token}\n` +
			`Time: ${new Date(timestamp).toLocaleString()}`
		);
	}

	/**
	 * Sends a notification to a user
	 */
	private async sendNotification(
		userId: string,
		message: string,
	): Promise<void> {
		await bot.api.sendMessage(userId, message);
	}

	/**
	 * Adds a wallet subscription for a user
	 */
	public async addWalletSubscription(
		walletAddress: string,
		userId: string,
	): Promise<void> {
		// Update in-memory subscriptions
		if (!this.subscriptions.has(walletAddress)) {
			this.subscriptions.set(walletAddress, new Set());
		}
		this.subscriptions.get(walletAddress)?.add(userId);

		// Subscribe via WebSocket if connected
		if (this.isConnected()) {
			await this.subscribeToWallet(walletAddress, userId);
		}
	}

	/**
	 * Removes a wallet subscription for a user
	 */
	public async removeWalletSubscription(
		walletAddress: string,
		userId: string,
	): Promise<void> {
		const subscribers = this.subscriptions.get(walletAddress);
		if (subscribers) {
			subscribers.delete(userId);
			if (subscribers.size === 0) {
				this.subscriptions.delete(walletAddress);
			}
		}
	}
}

export const websocketService = new WebSocketService();
