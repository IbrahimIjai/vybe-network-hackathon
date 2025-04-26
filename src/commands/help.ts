import { CommandContext } from "grammy";
import { MyContext } from "../types/session";
import { KeyboardUtils } from "../utils/keyboard";

export const handleHelpCommand = async (
	ctx: CommandContext<MyContext> | MyContext,
): Promise<void> => {
	try {
		const helpMessage = `
🌠 *Vybe Analytics Bot Help* 🌠

Here's what you can do with this bot:

📊 *View Your Wallets*
• See all your connected wallets and their balances
• Get detailed token breakdowns for each wallet

💰 *Track Solana Assets*
• Add your wallet addresses to track balances
• Monitor portfolio value over time

🔍 *Commands*
• /start - Start the bot and view your wallets
• /help - Show this help message
• /wallets - View all your connected wallets

💡 *Tips*
• Add multiple wallets by separating addresses with commas
• Track any Solana wallet - even if it's not yours!
• All data is refreshed in real-time from the blockchain
`;

		// Send help message with the main keyboard
		await ctx.reply(helpMessage, {
			parse_mode: "Markdown",
			reply_markup: KeyboardUtils.createMainKeyboard(),
		});
	} catch (error) {
		console.error("Error handling help command:", error);
		await ctx.reply("An error occurred while showing help. Please try again.");
	}
};

// Function for handling the help button
export const showHelp = async (ctx: MyContext): Promise<void> => {
	await handleHelpCommand(ctx);
};
