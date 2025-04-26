import { Context, SessionFlavor, Api } from "grammy";

// Define session data interface
export interface SessionData {}

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
