import { CommandContext, InlineKeyboard } from "grammy";
import { MyContext } from "../types/session";
import { VybeApi } from "../api/vybe";
import { FormatUtils } from "../utils/format";

/**
 * Handle price command
 * Shows price chart for a token by address
 */
export const handlePriceCommand = async (
	ctx: CommandContext<MyContext>,
): Promise<void> => {
	try {
		// Get the command arguments
		const args = ctx.match.trim();

		// If no arguments, show usage
		if (!args) {
			await ctx.reply(
				"Please provide a token address. Example: `/price SOL` or `/price tokenAddress`",
				{
					parse_mode: "Markdown",
				},
			);
			return;
		}

		// Get token information
		await displayPriceChart(ctx, args);
	} catch (error) {
		console.error("Error handling price command:", error);
		await ctx.reply(
			"An error occurred while fetching price data. Please try again.",
		);
	}
};

/**
 * Display price chart for a token
 */
export const displayPriceChart = async (
	ctx: MyContext,
	mintAddress: string,
): Promise<void> => {
	// Show loading message
	const loadingMsg = await ctx.reply("Loading price chart...");

	try {
		// First get token details to confirm it exists and get name/symbol
		const tokenDetails = await VybeApi.getDetailedTokenInfo(mintAddress);

		// If token not found, show error
		if (!tokenDetails) {
			await ctx.api.editMessageText(
				loadingMsg.chat.id,
				loadingMsg.message_id,
				"Token not found. Please check the address and try again.",
			);
			return;
		}

		// Get OHLCV data
		const ohlcvData = await VybeApi.getTokenOHLCV(mintAddress, "1d", 14);

		// If no price data, show error
		if (!ohlcvData || ohlcvData.length === 0) {
			await ctx.api.editMessageText(
				loadingMsg.chat.id,
				loadingMsg.message_id,
				`No price data available for ${tokenDetails.symbol || "this token"}.`,
			);
			return;
		}

		// Create text-based chart
		const symbol = tokenDetails.symbol || "Token";
		const name = tokenDetails.name || "Unknown Token";
		const currentPrice = parseFloat(tokenDetails.price || "0");

		// Process OHLCV data
		const processedData = ohlcvData
			.map((item: any) => ({
				time: new Date(item.time * 1000),
				close: parseFloat(item.close),
			}))
			.sort((a: any, b: any) => a.time.getTime() - b.time.getTime());

		// Create chart d3, whatever, not sure

		// Calculate price change
		const oldestPrice = processedData[0]?.close || 0;
		const latestPrice = processedData[processedData.length - 1]?.close || 0;
		const priceChange = latestPrice - oldestPrice;
		const priceChangePercent =
			oldestPrice !== 0 ? (priceChange / oldestPrice) * 100 : 0;

		// Format change text
		const changeSign = priceChange >= 0 ? "+" : "";
		const changeText = `${changeSign}${FormatUtils.formatCurrency(
			priceChange,
		)} (${changeSign}${priceChangePercent.toFixed(2)}%)`;

		// Create message
		let message = `*${name} (${symbol}) Price Chart*\n\n`;
		message += `*Current Price:* ${FormatUtils.formatCurrency(currentPrice)}\n`;
		message += `*14-Day Change:* ${changeText}\n\n`;
		message += "```\n";
		message += `*CHART COMMING SOON!!*`;
		message += "```\n";

		// Add time range info
		const startDate = formatDate(processedData[0]?.time);
		const endDate = formatDate(processedData[processedData.length - 1]?.time);
		message += `\nShowing price data from ${startDate} to ${endDate}`;

	
		message += `\n\n[View on Vybe.fyi](https://vybe.fyi/tokens/${mintAddress}?tab=overview)\n`;

		const keyboard = new InlineKeyboard()
			.text("7 Days", `price_range:${mintAddress}:7d`)
			.text("14 Days", `price_range:${mintAddress}:14d`)
			.text("30 Days", `price_range:${mintAddress}:30d`)
			.row()
			.text("📋 Copy Address", `copy_token:${mintAddress}`)
			.row()
			.text("« View Token Details", `token_details:${mintAddress}`);


		await ctx.api.editMessageText(
			loadingMsg.chat.id,
			loadingMsg.message_id,
			message,
			{
				parse_mode: "Markdown",
				reply_markup: keyboard,
			},
		);
	} catch (error) {
		console.error("Error displaying price chart:", error);
		await ctx.api.editMessageText(
			loadingMsg.chat.id,
			loadingMsg.message_id,
			"An error occurred while generating the price chart. Please try again.",
		);
	}
};

/**
 * Format date as MM/DD
 */
function formatDate(date?: Date): string {
	if (!date) return "N/A";
	return `${date.getMonth() + 1}/${date.getDate()}`;
}
