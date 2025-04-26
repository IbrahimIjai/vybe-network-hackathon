import { CommandContext, InlineKeyboard } from "grammy";
import { MyContext } from "../types/session";
import { redisService } from "../services/redis";
import { VybeApi } from "../api/vybe";
import { FormatUtils } from "../utils/format";
import { KeyboardUtils } from "../utils/keyboard";

export const handleStartCommand = async (
	ctx: CommandContext<MyContext>,
): Promise<void> => {
	try {
		// Get user data
		if (!ctx.from) {
			await ctx.reply("Could not identify user. Please try again.");
			return;
		}

		const userId = ctx.from.id;
		const username = ctx.from.username || ctx.from.first_name || "there";

		// Register/update user in database
		await redisService.registerUser(userId, username);

		// Get user wallet data
		const userData = await redisService.getUserData(userId);
		const wallets = userData?.wallets || [];

		// Initial welcome message
		const welcomeMessage = `
👋 *Welcome to Vybe Analytics Bot, ${username}!*

Get real-time analytics for Solana tokens, wallets, and programs directly in Telegram.
`;

		// Create wallet overview table
		let walletMessage = "";

		if (wallets.length > 0) {
			try {
				// Create loading message
				const loadingMsg = await ctx.reply("Loading wallet balances...");

				// Fetch wallet balances
				const walletAddresses = wallets.map((w) => w.address);
				const balances = await VybeApi.getMultipleWalletBalances(
					walletAddresses,
				);

				// Create wallet table header
				walletMessage = "\n*Your Wallet Overview:*\n```\n";
				walletMessage += "Wallet               | Balance\n";
				walletMessage += "---------------------|-----------\n";

				// Add wallet rows
				wallets.forEach((wallet) => {
					const truncatedAddress = FormatUtils.truncateAddress(wallet.address);
					const balance = balances[wallet.address] || 0;
					const balanceFormatted = FormatUtils.formatCurrency(balance);

					// Create table row with padding
					const addressPadded = truncatedAddress.padEnd(20, " ");
					walletMessage += `${addressPadded} | ${balanceFormatted}\n`;
				});

				walletMessage += "```\n";

				// Calculate total value
				const totalValue = Object.values(balances).reduce(
					(sum, value) => sum + value,
					0,
				);
				walletMessage += `\n*Total Portfolio Value:* ${FormatUtils.formatCurrency(
					totalValue,
				)}\n`;

				// Delete loading message
				await ctx.api.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);
			} catch (error) {
				console.error("Error fetching wallet balances:", error);
				walletMessage = "\n*Your Wallets:*\n";
				wallets.forEach((wallet) => {
					walletMessage += `• \`${FormatUtils.truncateAddress(
						wallet.address,
					)}\`\n`;
				});
				walletMessage += "\n_Couldn't load balances. Please try refreshing._\n";
			}
		} else {
			// No wallets yet
			walletMessage = "\n*Your Wallet Overview:*\n```\n";
			walletMessage += "Wallet               | Balance\n";
			walletMessage += "---------------------|-----------\n";
			walletMessage += "No wallets added yet | $0.00\n";
			walletMessage += "```\n";
			walletMessage += "\nAdd a wallet to track your Solana assets.\n";
		}

		// Create keyboard
		const keyboard = KeyboardUtils.createWalletListKeyboard(wallets);

		// Send complete message with wallet info and keyboard
		await ctx.reply(welcomeMessage + walletMessage, {
			parse_mode: "Markdown",
			reply_markup: keyboard,
		});
	} catch (error) {
		console.error("Error handling start command:", error);
		await ctx.reply(
			"An error occurred while starting the bot. Please try again by typing /help",
		);
	}
};

/**
 * Display wallet tokens detail
 */
export const displayWalletDetail = async (
	ctx: MyContext,
	walletAddress: string,
): Promise<void> => {
	try {
		// Create loading message
		const loadingMsg = await ctx.reply(
			`Loading wallet details for ${FormatUtils.truncateAddress(
				walletAddress,
			)}...`,
		);

		// Fetch wallet balance data
		const walletData = await VybeApi.getTokenBalance(walletAddress);

		if (
			!walletData ||
			!walletData.balances ||
			walletData.balances.length === 0
		) {
			await ctx.api.editMessageText(
				loadingMsg.chat.id,
				loadingMsg.message_id,
				`No tokens found in this wallet or wallet doesn't exist.`,
				{
					reply_markup: KeyboardUtils.createBackKeyboard(),
				},
			);
			return;
		}

		// Sort tokens by USD value
		const sortedTokens = [...walletData.balances].sort(
			(a, b) => b.usdValue - a.usdValue,
		);

		// Create wallet detail message
		let message = `*Wallet Detail: \`${FormatUtils.truncateAddress(
			walletAddress,
		)}\`*\n\n`;
		message += `Total Value: ${FormatUtils.formatCurrency(
			walletData.totalUsdValue,
		)}\n\n`;
		message += "*Token Holdings:*\n```\n";
		message += "Token      | Amount            | Value\n";
		message += "-----------|--------------------|------------\n";

		// Add token rows (limit to top 10)
		const tokensToShow = sortedTokens.slice(0, 10);
		tokensToShow.forEach((token) => {
			const symbol = (token.symbol || "Unknown").padEnd(10, " ");
			const amount = FormatUtils.formatTokenAmount(
				token.amount,
				token.decimals,
			).padEnd(18, " ");
			const value = FormatUtils.formatCurrency(token.usdValue);

			message += `${symbol} | ${amount} | ${value}\n`;
		});

		message += "```\n";

		// Add info about additional tokens
		if (sortedTokens.length > 10) {
			const remainingValue = sortedTokens
				.slice(10)
				.reduce((sum, token) => sum + token.usdValue, 0);

			message += `\n_+${
				sortedTokens.length - 10
			} more tokens worth ${FormatUtils.formatCurrency(remainingValue)}_\n`;
		}

		// Update the loading message with wallet details
		await ctx.api.editMessageText(
			loadingMsg.chat.id,
			loadingMsg.message_id,
			message,
			{
				parse_mode: "Markdown",
				reply_markup: KeyboardUtils.createBackKeyboard(),
			},
		);
	} catch (error) {
		console.error("Error displaying wallet detail:", error);
		await ctx.reply(`Error fetching wallet details. Please try again later.`, {
			reply_markup: KeyboardUtils.createBackKeyboard(),
		});
	}
};
