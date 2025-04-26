import { CommandContext } from "grammy";
import { MyContext } from "../types/session";
import { realtimePriceService } from "../services/realtime-price";
import { transferWatcherService } from "../services/transfer-watcher";
import { VybeApi } from "../api/vybe";
import { FormatUtils } from "../utils/format";

/**
 * Handle /track command for tracking tokens or wallet addresses
 */
export const handleTrackCommand = async (
	ctx: CommandContext<MyContext>,
): Promise<void> => {
	try {
		const input = ctx.match.trim();

		if (!input) {
			await showTrackingHelp(ctx);
			return;
		}

		const args = input.split(" ");
		const command = args[0]?.toLowerCase();

		if (command === "price") {
			await handleTrackPrice(ctx, args.slice(1).join(" "));
		} else if (command === "wallet") {
			await handleTrackWallet(ctx, args.slice(1).join(" "));
		} else if (command === "list") {
			await handleListTracking(ctx);
		} else if (command === "remove") {
			await handleRemoveTracking(ctx, args.slice(1).join(" "));
		} else {
			// Assume it's a token or wallet directly
			if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(args[0])) {
				await handleTrackWallet(ctx, args[0]);
			} else {
				await handleTrackPrice(ctx, args[0]);
			}
		}
	} catch (error) {
		console.error("Error handling track command:", error);
		await ctx.reply(
			"An error occurred while processing your command. Please try again.",
		);
	}
};

/**
 * Show help for the track command
 */
async function showTrackingHelp(ctx: CommandContext<MyContext>): Promise<void> {
	const helpText = `
*Tracking Command Help*

Track token prices or wallets to receive updates.

*Commands:*
• \`/track price SOL\` - Track SOL token price
• \`/track wallet ADDRESS\` - Track wallet for token transfers
• \`/track list\` - List all tracked items
• \`/track remove SOL\` - Stop tracking SOL
• \`/track remove wallet ADDRESS\` - Stop tracking wallet

*Examples:*
\`/track price BONK\`
\`/track wallet 8JnNWJ41QgY5MzTAcS18p1SYoNAuKQD1UoqDYycQZ7AC\`
`;

	await ctx.reply(helpText, { parse_mode: "Markdown" });
}

/**
 * Handle tracking a token price
 */
async function handleTrackPrice(
	ctx: CommandContext<MyContext>,
	symbol: string,
): Promise<void> {
	if (!symbol) {
		await ctx.reply(
			"Please provide a token symbol to track. Example: `/track price SOL`",
			{
				parse_mode: "Markdown",
			},
		);
		return;
	}

	const normalizedSymbol = symbol.toUpperCase().trim();

	// Initialize session data if needed
	if (!ctx.session.trackedPrices) {
		ctx.session.trackedPrices = [];
	}

	// Check if already tracking
	if (ctx.session.trackedPrices.includes(normalizedSymbol)) {
		await ctx.reply(`You are already tracking ${normalizedSymbol} price.`);
		return;
	}

	// Verify token exists
	try {
		const loadingMsg = await ctx.reply(`Checking token ${normalizedSymbol}...`);

		const tokenExists = await VybeApi.checkTokenExists(normalizedSymbol);

		if (!tokenExists) {
			await ctx.api.editMessageText(
				loadingMsg.chat.id,
				loadingMsg.message_id,
				`Token ${normalizedSymbol} not found. Please check the symbol and try again.`,
			);
			return;
		}

		// Add to tracking
		ctx.session.trackedPrices.push(normalizedSymbol);
		realtimePriceService.trackToken(normalizedSymbol);

		// Get current price data
		const priceData = realtimePriceService.getPriceData(normalizedSymbol);

		let message = `Now tracking ${normalizedSymbol} price.`;

		if (priceData) {
			message += `\n\nCurrent price: ${FormatUtils.formatCurrency(
				priceData.price,
			)}`;

			if (priceData.change24h) {
				const changePrefix = priceData.change24h >= 0 ? "+" : "";
				message += `\n24h change: ${changePrefix}${FormatUtils.formatPercentage(
					priceData.change24h,
					2,
				)}`;
			}
		}

		message +=
			"\n\nUse `/price ${normalizedSymbol}` to see detailed price information.";

		await ctx.api.editMessageText(
			loadingMsg.chat.id,
			loadingMsg.message_id,
			message,
			{ parse_mode: "Markdown" },
		);
	} catch (error) {
		console.error(`Error tracking price for ${normalizedSymbol}:`, error);
		await ctx.reply(
			`Error tracking ${normalizedSymbol}. Please try again later.`,
		);
	}
}

/**
 * Handle tracking a wallet for transfers
 */
async function handleTrackWallet(
	ctx: CommandContext<MyContext>,
	address: string,
): Promise<void> {
	if (!address) {
		await ctx.reply(
			"Please provide a wallet address to track. Example: `/track wallet ADDRESS`",
			{
				parse_mode: "Markdown",
			},
		);
		return;
	}

	// Validate wallet address
	if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
		await ctx.reply(
			"Invalid wallet address format. Please provide a valid Solana address.",
		);
		return;
	}

	// Initialize session data if needed
	if (!ctx.session.trackedWallets) {
		ctx.session.trackedWallets = [];
	}

	// Check if already tracking
	if (ctx.session.trackedWallets.includes(address)) {
		await ctx.reply(
			`You are already tracking wallet ${FormatUtils.truncateAddress(
				address,
			)}.`,
		);
		return;
	}

	try {
		const loadingMsg = await ctx.reply(
			`Checking wallet ${FormatUtils.truncateAddress(address)}...`,
		);

		// Check if wallet exists
		const walletInfo = await VybeApi.getWalletInfo(address);

		if (!walletInfo || !walletInfo.balances) {
			await ctx.api.editMessageText(
				loadingMsg.chat.id,
				loadingMsg.message_id,
				`Wallet not found or has no activity. Please check the address and try again.`,
			);
			return;
		}

		// Add to tracking
		ctx.session.trackedWallets.push(address);
		transferWatcherService.subscribeWallet(address, ctx.chat.id);

		// Check for recent transfers
		const recentTransfers = await transferWatcherService.manualCheck(address);

		let message = `Now tracking wallet ${FormatUtils.truncateAddress(
			address,
		)} for token transfers.`;

		if (recentTransfers.length > 0) {
			message += `\n\n${recentTransfers.length} transfer(s) found in the last hour.`;
		} else {
			message += "\n\nNo recent transfers found.";
		}

		if (ctx.session.notificationsEnabled !== true) {
			message +=
				"\n\nUse `/notifications on` to enable real-time notifications.";
		}

		await ctx.api.editMessageText(
			loadingMsg.chat.id,
			loadingMsg.message_id,
			message,
			{ parse_mode: "Markdown" },
		);
	} catch (error) {
		console.error(`Error tracking wallet ${address}:`, error);
		await ctx.reply(`Error tracking wallet. Please try again later.`);
	}
}

/**
 * Handle listing all tracked items
 */
async function handleListTracking(
	ctx: CommandContext<MyContext>,
): Promise<void> {
	try {
		const trackedPrices = ctx.session.trackedPrices || [];
		const trackedWallets = ctx.session.trackedWallets || [];

		if (trackedPrices.length === 0 && trackedWallets.length === 0) {
			await ctx.reply(
				"You are not tracking any tokens or wallets. Use `/track price SYMBOL` or `/track wallet ADDRESS` to start tracking.",
				{
					parse_mode: "Markdown",
				},
			);
			return;
		}

		let message = "*Your Tracking List*\n\n";

		if (trackedPrices.length > 0) {
			message += "*Tracked Prices:*\n";

			for (const symbol of trackedPrices) {
				const priceData = realtimePriceService.getPriceData(symbol);

				if (priceData) {
					const changePrefix = (priceData.change24h ?? 0) >= 0 ? "+" : "";
					message += `• ${symbol}: ${FormatUtils.formatCurrency(
						priceData.price,
					)} (${changePrefix}${FormatUtils.formatPercentage(
						priceData.change24h || 0,
						2,
					)})\n`;
				} else {
					message += `• ${symbol}\n`;
				}
			}
		}

		if (trackedWallets.length > 0) {
			if (trackedPrices.length > 0) message += "\n";
			message += "*Tracked Wallets:*\n";

			for (const wallet of trackedWallets) {
				message += `• ${FormatUtils.truncateAddress(wallet)}\n`;
			}
		}

		// Add notification status
		message += "\n*Notifications:* ";
		message +=
			ctx.session.notificationsEnabled === true ? "Enabled ✅" : "Disabled ❌";

		if (ctx.session.notificationsEnabled !== true) {
			message += "\nUse `/notifications on` to enable notifications.";
		}

		await ctx.reply(message, { parse_mode: "Markdown" });
	} catch (error) {
		console.error("Error listing tracked items:", error);
		await ctx.reply(
			"An error occurred while fetching your tracking list. Please try again.",
		);
	}
}

/**
 * Handle removing a tracked item
 */
async function handleRemoveTracking(
	ctx: CommandContext<MyContext>,
	input: string,
): Promise<void> {
	if (!input) {
		await ctx.reply(
			"Please specify what to remove. Example: `/track remove SOL` or `/track remove wallet ADDRESS`",
			{
				parse_mode: "Markdown",
			},
		);
		return;
	}

	const args = input.split(" ");

	if (args[0]?.toLowerCase() === "wallet" && args[1]) {
		// Remove tracked wallet
		const address = args[1];

		if (
			!ctx.session.trackedWallets ||
			!ctx.session.trackedWallets.includes(address)
		) {
			await ctx.reply(
				`You are not tracking wallet ${FormatUtils.truncateAddress(address)}.`,
			);
			return;
		}

		ctx.session.trackedWallets = ctx.session.trackedWallets.filter(
			(w) => w !== address,
		);
		transferWatcherService.unsubscribeWallet(address, ctx.chat.id);

		await ctx.reply(
			`Stopped tracking wallet ${FormatUtils.truncateAddress(address)}.`,
		);
	} else {
		// Remove tracked price
		const symbol = args[0].toUpperCase();

		if (
			!ctx.session.trackedPrices ||
			!ctx.session.trackedPrices.includes(symbol)
		) {
			await ctx.reply(`You are not tracking ${symbol} price.`);
			return;
		}

		ctx.session.trackedPrices = ctx.session.trackedPrices.filter(
			(s) => s !== symbol,
		);

		// Only untrack from service if no one else is tracking
		const stillTracked = false; // You would need to check if other users are still tracking
		if (!stillTracked) {
			realtimePriceService.untrackToken(symbol);
		}

		await ctx.reply(`Stopped tracking ${symbol} price.`);
	}
}
