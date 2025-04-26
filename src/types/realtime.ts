// Types for realtime price updates
export interface PriceUpdate {
	symbol: string;
	price: number;
	change24h?: number;
	volume24h?: number;
	timestamp: number;
}

// Types for realtime token transfers
export interface TransferNotification {
	walletAddress: string;
	transfer: {
		signature: string;
		from: string;
		to: string;
		amount: string;
		symbol: string;
		usdValue: number;
		timestamp: number;
	};
}

// Types for price alerts
export interface PriceAlert {
	symbol: string;
	above?: number;
	below?: number;
	percentChange?: number;
	userId: number;
	chatId: number;
}

// Types for tracking settings
export interface TrackingPreference {
	userId: number;
	chatId: number;
	trackedPrices: string[];
	trackedWallets: string[];
	notificationsEnabled: boolean;
}
