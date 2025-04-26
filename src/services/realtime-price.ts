import WebSocket from "ws";
import config from "../config";
import { EventEmitter } from "events";
import { PriceUpdate } from "../types/realtime";
import { cacheService } from "./cache";
import { VybeApi } from "../api/vybe";

export class RealtimePriceService extends EventEmitter {
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private trackedTokens: Set<string> = new Set();
	private priceData: Map<string, PriceUpdate> = new Map();
	private connectionActive = false;
	private reconnectTimer: NodeJS.Timeout | null = null;
	private readonly MAX_RECONNECT_ATTEMPTS = 10;
	private readonly RECONNECT_INTERVAL = 5000; // 5 seconds

	constructor() {
		super();
		// Add default tokens to track
		const defaultTokens = ["SOL", "BONK", "JTO", "JUP", "PYTH"];
		defaultTokens.forEach((token) => this.trackToken(token));

		this.connect();

		// Fallback polling for price updates in case WebSocket fails
		setInterval(() => this.pollPrices(), 60000); // Every minute
	}

	/**
	 * Connect to the price WebSocket
	 */
	private connect() {
		try {
			// Make sure we have the WebSocket URL
			if (!config.PRICE_WEBSOCKET_URL) {
				console.error("Missing PRICE_WEBSOCKET_URL in config");
				return;
			}

			this.ws = new WebSocket(config.PRICE_WEBSOCKET_URL);

			this.ws.on("open", () => {
				console.log("Price WebSocket connected");
				this.connectionActive = true;
				this.reconnectAttempts = 0;
				this.subscribeToTokens();
			});

			this.ws.on("message", (data) => {
				try {
					const update = JSON.parse(data.toString());
					this.handlePriceUpdate(update);
				} catch (error) {
					console.error("Error parsing WebSocket message:", error);
				}
			});

			this.ws.on("close", () => this.handleDisconnect());
			this.ws.on("error", (error) => this.handleError(error));
		} catch (error) {
			console.error("Error connecting to price WebSocket:", error);
			this.handleDisconnect();
		}
	}

	/**
	 * Handle disconnection by attempting to reconnect
	 */
	private handleDisconnect() {
		this.connectionActive = false;
		console.log("Price WebSocket disconnected");

		if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
			this.reconnectAttempts++;
			console.log(
				`Attempting to reconnect (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`,
			);

			if (this.reconnectTimer) {
				clearTimeout(this.reconnectTimer);
			}

			this.reconnectTimer = setTimeout(() => {
				this.connect();
			}, this.RECONNECT_INTERVAL);
		} else {
			console.error(
				"Max reconnection attempts reached. Falling back to polling.",
			);
		}
	}

	/**
	 * Handle WebSocket errors
	 */
	private handleError(error: Error) {
		console.error("Price WebSocket error:", error);
	}

	/**
	 * Subscribe to token price updates
	 */
	private subscribeToTokens() {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			return;
		}

		const message = {
			type: "subscribe",
			tokens: Array.from(this.trackedTokens),
		};

		try {
			this.ws.send(JSON.stringify(message));
		} catch (error) {
			console.error("Error subscribing to tokens:", error);
		}
	}

	/**
	 * Handle price update from WebSocket
	 */
	private handlePriceUpdate(update: any) {
		if (!update || !update.symbol) {
			return;
		}

		const priceUpdate: PriceUpdate = {
			symbol: update.symbol,
			price: update.price,
			change24h: update.change24h,
			volume24h: update.volume24h,
			timestamp: Date.now(),
		};

		// Store the price update
		this.priceData.set(update.symbol, priceUpdate);

		// Cache the price data (5 minute TTL)
		cacheService.set(`price:${update.symbol}`, priceUpdate, 300000);

		// Emit the price update event
		this.emit("priceUpdate", priceUpdate);
	}

	/**
	 * Track a token for price updates
	 */
	public trackToken(symbol: string): boolean {
		if (!symbol) return false;

		const normalized = symbol.toUpperCase();
		this.trackedTokens.add(normalized);

		// If connected, subscribe to this token
		if (this.connectionActive) {
			this.subscribeToTokens();
		}

		// Immediately try to get price data
		this.pollPriceForToken(normalized);

		return true;
	}

	/**
	 * Stop tracking a token
	 */
	public untrackToken(symbol: string): boolean {
		if (!symbol) return false;

		const normalized = symbol.toUpperCase();
		const removed = this.trackedTokens.delete(normalized);

		// If connected, update subscriptions
		if (removed && this.connectionActive) {
			this.subscribeToTokens();
		}

		return removed;
	}

	/**
	 * Get current price data for a token
	 */
	public getPriceData(symbol: string): PriceUpdate | null {
		if (!symbol) return null;

		const normalized = symbol.toUpperCase();

		// First check our local cache
		if (this.priceData.has(normalized)) {
			return this.priceData.get(normalized) || null;
		}

		// Then check the cache service
		const cached = cacheService.get<PriceUpdate>(`price:${normalized}`);
		if (cached) {
			return cached;
		}

		// If not found, try to poll for it now
		this.pollPriceForToken(normalized);

		return null;
	}

	/**
	 * Fallback method to poll for prices using REST API
	 */
	private async pollPrices() {
		const tokens = Array.from(this.trackedTokens);

		for (const symbol of tokens) {
			await this.pollPriceForToken(symbol);
		}
	}

	/**
	 * Poll for price data for a specific token
	 */
	private async pollPriceForToken(symbol: string) {
		try {
			// Get token details from API
			const tokenDetails = await VybeApi.getTokenBySymbol(symbol);

			if (tokenDetails) {
				const priceUpdate: PriceUpdate = {
					symbol: symbol,
					price: tokenDetails.price || 0,
					change24h: tokenDetails.priceChange24h || 0,
					volume24h: tokenDetails.volume24h || 0,
					timestamp: Date.now(),
				};

				// Store the price update
				this.priceData.set(symbol, priceUpdate);

				// Cache the price data (5 minute TTL)
				cacheService.set(`price:${symbol}`, priceUpdate, 300000);

				// Emit the price update event
				this.emit("priceUpdate", priceUpdate);
			}
		} catch (error) {
			console.error(`Error polling price for ${symbol}:`, error);
		}
	}

	/**
	 * Get list of all tracked tokens
	 */
	public getTrackedTokens(): string[] {
		return Array.from(this.trackedTokens);
	}
}

// Export singleton instance
export const realtimePriceService = new RealtimePriceService();
