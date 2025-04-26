import { CommandContext } from "grammy";
import { MyContext } from "../types/session";

export const handleStartCommand = async (
	ctx: CommandContext<MyContext>,
): Promise<void> => {
	try {
		const username = ctx.from?.username || ctx.from?.first_name || "there";

		const welcomeMessage = `
👋 *Welcome to Vybe Analytics Bot, ${username}!*

Get real-time analytics for Solana tokens, wallets, and programs directly in Telegram.

*What can I do?*
• Track token prices and wallet transfers
• Get detailed token and program analytics
• Monitor whale movements
• And much more!

Type /help to see all available commands.
`;

		await ctx.reply(welcomeMessage, {
			parse_mode: "Markdown",
		});
	} catch (error) {
		console.error("Error handling start command:", error);
		await ctx.reply(
			"An error occurred while starting the bot. Please try again by typing /help",
		);
	}
};
