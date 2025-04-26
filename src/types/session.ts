import { Context, SessionFlavor, Api } from "grammy";

// Define session data interface
export interface SessionData {
	trackedPrices?: string[]; // Array of tracked token symbols
	priceAlerts?: {
		[symbol: string]: {
			above?: number;
			below?: number;
		};
	};
	trackedWallets?: string[]; // Array of wallet addresses to track
	notificationsEnabled?: boolean;
}

// Create custom context type with session support
export type MyContext = Context & SessionFlavor<SessionData>;

// Define proper types for API methods
declare module "grammy" {
	interface ApiMethods {
		editMessageText(
			chat_id: number | string,
			message_id: number,
			text: string,
			other?: {
				parse_mode?: string;
				entities?: any[];
				disable_web_page_preview?: boolean;
				reply_markup?: any;
				inline_message_id?: string;
			},
		): Promise<any>;
	}
}
