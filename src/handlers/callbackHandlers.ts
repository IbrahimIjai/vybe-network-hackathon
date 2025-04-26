import { MyContext } from "../types/session";
import { redisService, UserWallet } from "../services/redis";
import { showHelp } from "../commands/help";
import { displayWalletDetail } from "../commands/start";
import { FormatUtils } from "../utils/format";
import { KeyboardUtils } from "../utils/keyboard";

/**
 * Handle all callback queries from inline buttons
 */
export const handleCallbackQuery = async (ctx: MyContext): Promise<void> => {
	if (!ctx.callbackQuery?.data) return;

	const callbackData = ctx.callbackQuery.data;

	try {
		// Answer the callback query to stop loading state
		await ctx.answerCallbackQuery();

		if (callbackData === "show_help") {
			// Handle help button click
			await showHelp(ctx);
		} else if (callbackData === "wallet_add") {
			// Handle add wallet button click  from start command,...
			await handleAddWalletButton(ctx);
		} else if (callbackData === "view_wallets") {
			// Handle view wallets button click
			await handleViewWalletsButton(ctx);
		} else if (callbackData === "back_to_wallets") {
			// Handle back to wallets button click
			await handleViewWalletsButton(ctx);
		} else if (callbackData.startsWith("wallet_view:")) {
			// Handle wallet view button click
			const walletAddress = callbackData.split(":")[1];
			await displayWalletDetail(ctx, walletAddress);
		}
	} catch (error) {
		console.error("Error handling callback query:", error);
		await ctx.reply("An error occurred. Please try again.");
	}
};

/**
 * Handle add wallet button
 */
const handleAddWalletButton = async (ctx: MyContext): Promise<void> => {
	const message = `
*Add Your Wallet*

Please enter Solana wallet addresses to track, using the following format:
\`address1,address2,address3\`

*Example:*
\`9ZNTfG4NyQgxy2SWjSiQoUyBPEvXT2xo7fKc5hPYYJ7b,5xot9PVkphiX2adznghwrAQoo5sMm4TJsQi7WLMYgRfY\`

You can add multiple addresses at once by separating them with commas (no spaces).
`;

	await ctx.reply(message, {
		parse_mode: "Markdown",
		reply_markup: KeyboardUtils.createBackKeyboard(),
	});

	// Save state that user is adding wallet
	if (ctx.from) {
		// Here we would typically save to session that user is in add_wallet mode
		// For simplicity, we'll let the next message handler check if input looks like a wallet
	}
};

/**
 * Handle view wallets button
 */
const handleViewWalletsButton = async (ctx: MyContext): Promise<void> => {
	if (!ctx.from) {
		await ctx.reply("Could not identify user. Please try again.");
		return;
	}

	const userId = ctx.from.id;
	const userData = await redisService.getUserData(userId);
	const wallets = userData?.wallets || [];

	if (wallets.length === 0) {
		await ctx.reply(
			"You don't have any wallets added yet. Click the button below to add one.",
			{
				reply_markup: KeyboardUtils.createWalletListKeyboard([], true),
			},
		);
		return;
	}

	// Format wallet list message
	let message = "*Your Wallets:*\n\n";
	wallets.forEach((wallet, index) => {
		const label = wallet.label || FormatUtils.truncateAddress(wallet.address);
		message += `${index + 1}. \`${label}\` - \`${wallet.address}\`\n`;
	});

	await ctx.reply(message, {
		parse_mode: "Markdown",
		reply_markup: KeyboardUtils.createWalletListKeyboard(wallets),
	});
};
