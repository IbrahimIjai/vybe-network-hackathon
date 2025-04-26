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

		// Create ASCII chart
		const chart = createAsciiChart(processedData);

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
		message += chart;
		message += "```\n";

		// Add time range info
		const startDate = formatDate(processedData[0]?.time);
		const endDate = formatDate(processedData[processedData.length - 1]?.time);
		message += `\nShowing price data from ${startDate} to ${endDate}`;

		// Add explorer link
		message += `\n\n[View on Explorer](https://solscan.io/token/${mintAddress})\n`;

		// Create keyboard with options
		const keyboard = new InlineKeyboard()
			.text("7 Days", `price_range:${mintAddress}:7d`)
			.text("14 Days", `price_range:${mintAddress}:14d`)
			.text("30 Days", `price_range:${mintAddress}:30d`)
			.row()
			.text("📋 Copy Address", `copy_token:${mintAddress}`)
			.row()
			.text("« View Token Details", `token_details:${mintAddress}`);

		// Update loading message with chart
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
 * Create a simple ASCII chart from price data
 */
function createAsciiChart(
	data: { time: Date; close: number }[],
	width: number = 30,
	height: number = 10,
): string {
	if (data.length === 0) return "No data available";

	// Get min and max prices
	const prices = data.map((item) => item.close);
	const minPrice = Math.min(...prices);
	const maxPrice = Math.max(...prices);
	const priceRange = maxPrice - minPrice;

	// Handle flat price
	if (priceRange === 0) {
		const flatLine = "─".repeat(width);
		const chart = Array(height)
			.fill("")
			.map((_, i) => {
				if (i === Math.floor(height / 2)) return "│" + flatLine;
				return "│" + " ".repeat(width);
			})
			.join("\n");
		return chart + "\n" + "└" + "─".repeat(width);
	}

	// Create chart rows
	const chartRows: string[] = [];

	// Create each row of the chart
	for (let i = 0; i < height; i++) {
		const rowPrice = maxPrice - (i / (height - 1)) * priceRange;
		let row = "│";

		for (let j = 0; j < width; j++) {
			// Calculate which data point corresponds to this column
			const dataIndex = Math.min(
				Math.floor((j / width) * data.length),
				data.length - 1,
			);
			const price = data[dataIndex].close;

			// Add a point if the price crosses this row
			const nextDataIndex = Math.min(dataIndex + 1, data.length - 1);
			const nextPrice = data[nextDataIndex].close;

			const currentPriceAboveRow = price >= rowPrice;
			const nextPriceAboveRow = nextPrice >= rowPrice;

			if (currentPriceAboveRow && nextPriceAboveRow) {
				row += " ";
			} else if (currentPriceAboveRow && !nextPriceAboveRow) {
				row += "╲";
			} else if (!currentPriceAboveRow && nextPriceAboveRow) {
				row += "╱";
			} else if (Math.abs(price - rowPrice) < priceRange / (height * 2)) {
				row += "─";
			} else {
				row += " ";
			}
		}

		chartRows.push(row);
	}

	// Add x-axis
	chartRows.push("└" + "─".repeat(width));

	return chartRows.join("\n");
}

/**
 * Format date as MM/DD
 */
function formatDate(date?: Date): string {
	if (!date) return "N/A";
	return `${date.getMonth() + 1}/${date.getDate()}`;
}
