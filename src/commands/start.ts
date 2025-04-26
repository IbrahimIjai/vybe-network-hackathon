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

				// Fetch wallet balances with optimized API call
				const walletAddresses = wallets.map((w) => w.address);

				// Use the multi-wallet API for more efficient data fetching
				const balanceData = await VybeApi.getMultiWalletTokenBalances(
					walletAddresses,
				);

				// Create wallet table header
				walletMessage = "\n*Your Wallet Overview:*\n```\n";
				walletMessage += "Wallet(s)           \n";
				walletMessage += "-------------------------------\n";

				// Add wallet rows - check if ownerAddresses exists in the response
				if (
					balanceData.ownerAddresses &&
					Array.isArray(balanceData.ownerAddresses)
				) {
					balanceData.ownerAddresses.forEach((wallet: string) => {
						const truncatedAddress = FormatUtils.truncateAddress(wallet);
						const addressPadded = truncatedAddress.padEnd(20, " ");
						walletMessage += `${addressPadded}  \n`;
					});
				} else {
					// Fallback to using the original wallets array
					wallets.forEach((wallet) => {
						const truncatedAddress = FormatUtils.truncateAddress(
							wallet.address,
						);
						const addressPadded = truncatedAddress.padEnd(20, " ");
						walletMessage += `${addressPadded} | \n`;
					});
				}

				walletMessage += "--------------------------------\n";

				// Format total value
				const totalValueUsd = balanceData.totalTokenValueUsd
					? parseFloat(balanceData.totalTokenValueUsd)
					: 0;
				const formattedTotal = FormatUtils.formatCurrency(totalValueUsd);

				walletMessage += `Total Portfolio \n`;
				walletMessage += `T${formattedTotal}\n`;
				walletMessage += "```\n";

				// Add token count if available
				if (balanceData.totalTokenCount) {
					walletMessage += `\n*Total Tokens:* ${balanceData.totalTokenCount}\n`;
				}

				// Add 24h change if available
				if (balanceData.totalTokenValueUsd1dChange) {
					const change = parseFloat(balanceData.totalTokenValueUsd1dChange);
					const changePercent = (change / (totalValueUsd - change)) * 100;
					const changeSign = change >= 0 ? "+" : "";
					walletMessage += `*24h Change:* ${changeSign}${FormatUtils.formatCurrency(
						change,
					)} (${changeSign}${changePercent.toFixed(2)}%)\n`;
				}

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

		// Use the multi-wallet API to get more comprehensive data
		const walletData = await VybeApi.getMultiWalletTokenBalances([
			walletAddress,
		]);

		// Check if we have valid data
		if (!walletData || !walletData.data || walletData.data.length === 0) {
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

		// Sort tokens by USD value (highest first)
		const sortedTokens = [...walletData.data].sort(
			(a, b) => parseFloat(b.valueUsd) - parseFloat(a.valueUsd),
		);

		// Create wallet detail message
		let message = `*Wallet Detail: \`${FormatUtils.truncateAddress(
			walletAddress,
		)}\`*\n\n`;

		// Add wallet summary
		const totalUsdValue = parseFloat(walletData.totalTokenValueUsd || "0");
		message += `*Total Value:* ${FormatUtils.formatCurrency(totalUsdValue)}\n`;
		message += `*Number of Tokens:* ${
			walletData.totalTokenCount || sortedTokens.length
		}\n`;

		// Add SOL information if available
		const solToken = sortedTokens.find(
			(t) => t.symbol?.toUpperCase() === "SOL",
		);
		if (solToken) {
			const solAmount = parseFloat(solToken.amount);
			const solDecimals = solToken.decimals || 9;
			const solAmountFormatted = FormatUtils.formatTokenAmount(
				solAmount,
				solDecimals,
			);
			const solValueUsd = parseFloat(solToken.valueUsd);
			message += `*SOL Balance:* ${solAmountFormatted} SOL (${FormatUtils.formatCurrency(
				solValueUsd,
			)})\n`;
		}

		// Add staked SOL if available
		if (
			walletData.stakedSolBalance &&
			parseFloat(walletData.stakedSolBalance) > 0
		) {
			const stakedSol = parseFloat(walletData.stakedSolBalance);
			const stakedSolUsd = parseFloat(walletData.stakedSolBalanceUsd || "0");
			message += `*Staked SOL:* ${stakedSol.toFixed(
				4,
			)} SOL (${FormatUtils.formatCurrency(stakedSolUsd)})\n`;
		}

		// Add 24h change if available
		if (walletData.totalTokenValueUsd1dChange) {
			const change = parseFloat(walletData.totalTokenValueUsd1dChange);
			const changePercent = (change / (totalUsdValue - change)) * 100;
			const changeSign = change >= 0 ? "+" : "";
			message += `*24h Change:* ${changeSign}${FormatUtils.formatCurrency(
				change,
			)} (${changeSign}${changePercent.toFixed(2)}%)\n`;
		}

		message += `\n*Token Holdings:*\n\`\`\`\n`;
		message += "Token      | Amount            | Value\n";
		message += "-----------|--------------------|------------\n";

		// Add token rows (limit to top 10)
		const tokensToShow = sortedTokens.slice(0, 10);
		tokensToShow.forEach((token) => {
			const symbol = (token.symbol || "Unknown").padEnd(10, " ");
			const amount = FormatUtils.formatTokenAmount(
				parseFloat(token.amount),
				token.decimals,
			).padEnd(18, " ");
			const value = FormatUtils.formatCurrency(parseFloat(token.valueUsd));

			message += `${symbol} | ${amount} | ${value}\n`;
		});

		message += "```\n";

		// Add info about additional tokens
		if (sortedTokens.length > 10) {
			const remainingValue = sortedTokens
				.slice(10)
				.reduce((sum, token) => sum + parseFloat(token.valueUsd), 0);

			message += `\n_+${
				sortedTokens.length - 10
			} more tokens worth ${FormatUtils.formatCurrency(remainingValue)}_\n`;
		}

		// Add view on explorer link
		message += `\n[View on Explorer](https://solscan.io/account/${walletAddress})\n`;

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
