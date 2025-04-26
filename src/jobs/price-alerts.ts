import { realtimePriceService } from "../services/realtime-price";
import { bot } from "../index";
import { PriceUpdate } from "../types/realtime";
import { FormatUtils } from "../utils/format";
import { cacheService } from "../services/cache";

/**
 * PriceAlertService monitors price changes and sends alerts to users
 */
export class PriceAlertService {
	private static instance: PriceAlertService;
	private readonly SIGNIFICANT_CHANGE_THRESHOLD = 0.05; // 5% change
	private readonly ALERT_COOLDOWN_MS = 3600000; // 1 hour
	private readonly priceHistory: Map<string, number[]> = new Map();
	private readonly MAX_HISTORY_POINTS = 10;

	private constructor() {
		this.initialize();
	}

	public static getInstance(): PriceAlertService {
		if (!PriceAlertService.instance) {
			PriceAlertService.instance = new PriceAlertService();
		}
		return PriceAlertService.instance;
	}

	/**
	 * Initialize the service and set up listeners
	 */
	private initialize(): void {
		// Listen for price updates
		realtimePriceService.on("priceUpdate", (update: PriceUpdate) => {
			this.handlePriceUpdate(update);
		});

		console.log("Price alert service initialized");
	}

	/**
	 * Handle a price update event
	 */
	private handlePriceUpdate(update: PriceUpdate): void {
		try {
			const { symbol, price } = update;

			// Store price history for volatility detection
			this.updatePriceHistory(symbol, price);

			// Check if this update represents a significant change
			const isSignificantChange = this.isSignificantPriceChange(symbol, price);

			if (isSignificantChange) {
				// Send notification to users tracking this token
				this.notifyUsers(update);
			}
		} catch (error) {
			console.error("Error handling price update:", error);
		}
	}

	/**
	 * Update price history for a token
	 */
	private updatePriceHistory(symbol: string, price: number): void {
		if (!this.priceHistory.has(symbol)) {
			this.priceHistory.set(symbol, []);
		}

		const history = this.priceHistory.get(symbol)!;

		// Add new price
		history.push(price);

		// Keep only MAX_HISTORY_POINTS most recent prices
		if (history.length > this.MAX_HISTORY_POINTS) {
			history.shift();
		}

		this.priceHistory.set(symbol, history);
	}

	/**
	 * Determine if a price change is significant
	 */
	private isSignificantPriceChange(
		symbol: string,
		currentPrice: number,
	): boolean {
		const history = this.priceHistory.get(symbol);

		if (!history || history.length < 2) {
			return false;
		}

		// Get previous price (not the most recent one, which we just added)
		const previousPrice = history[history.length - 2];

		if (previousPrice === 0) {
			return false;
		}

		// Calculate percent change
		const percentChange = Math.abs(
			(currentPrice - previousPrice) / previousPrice,
		);

		// Check alert cooldown
		const lastAlertKey = `price_alert:${symbol}`;
		const lastAlertTime = cacheService.get<number>(lastAlertKey) || 0;
		const now = Date.now();

		if (now - lastAlertTime < this.ALERT_COOLDOWN_MS) {
			return false;
		}

		// Is this change significant?
		const isSignificant = percentChange >= this.SIGNIFICANT_CHANGE_THRESHOLD;

		// If significant, update the last alert time
		if (isSignificant) {
			cacheService.set(lastAlertKey, now);
		}

		return isSignificant;
	}

	/**
	 * Notify users about a significant price change
	 */
	private async notifyUsers(update: PriceUpdate): Promise<void> {
		try {
			// In a real implementation, you would get a list of all users tracking this token
			// For simplicity, we're just demonstrating the concept without user data persistence

			// Get all tracked sessions from a database/cache
			const usersToNotify = this.getUsersTrackingToken(update.symbol);

			if (usersToNotify.length === 0) {
				return;
			}

			// Create notification message
			const priceChangeSymbol =
				update.change24h && update.change24h >= 0 ? "📈" : "📉";
			const message =
				`${priceChangeSymbol} *${update.symbol} Price Alert*\n\n` +
				`Current price: ${FormatUtils.formatCurrency(update.price)}\n` +
				`24h change: ${
					update.change24h
						? FormatUtils.formatPercentage(update.change24h)
						: "N/A"
				}\n\n` +
				`Use \`/price ${update.symbol}\` for more details.`;

			// Send notification to each user
			for (const chatId of usersToNotify) {
				try {
					await bot.api.sendMessage(chatId, message, {
						parse_mode: "Markdown",
					});
				} catch (error) {
					console.error(`Error sending price alert to chat ${chatId}:`, error);
				}
			}
		} catch (error) {
			console.error("Error notifying users:", error);
		}
	}

	/**
	 * Get list of users tracking a token
	 * In a real implementation, this would query a database
	 */
	private getUsersTrackingToken(symbol: string): number[] {
		// Placeholder for a real database implementation
		// In a real app, you would query your database here
		return [];
	}
}

// Initialize the service as a singleton
export const priceAlertService = PriceAlertService.getInstance();
