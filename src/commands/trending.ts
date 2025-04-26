import { CommandContext, Context, InputFile } from "grammy";
import { VybeApi } from "../api/vybe";
import { MessageUtils } from "../utils/message";
import { FormatUtils } from "../utils/format";
import { ChartService } from "../services/chart";

//This command shows trending tokens based on volume and price changes
 
export const handleTrendingCommand = async (
	ctx: CommandContext<Context>,
): Promise<void> => {
	try {
		const loadingMessage = await ctx.reply("Fetching trending tokens...");

		try {
			const tokens = await VybeApi.getTokensList({
				sortByDesc: "volume24h",
				limit: 100,
			});

			if (!tokens || tokens.length === 0) {
				await ctx.api.editMessageText(
					loadingMessage.chat.id,
					loadingMessage.message_id,
					"No token data available at the moment.",
				);
				return;
			}

			const validTokens = tokens.filter(
				(token: any) =>
					token.price > 0 &&
					token.volume24h > 0 &&
					token.priceChange24hPercentage !== null &&
					token.priceChange24hPercentage !== undefined,
			);

			const volumeLeaders = [...validTokens]
				.sort((a: any, b: any) => b.volume24h - a.volume24h)
				.slice(0, 10);

			const priceGainers = [...validTokens]
				.filter((t: any) => t.priceChange24hPercentage > 0)
				.sort(
					(a: any, b: any) =>
						b.priceChange24hPercentage - a.priceChange24hPercentage,
				)
				.slice(0, 10);

let message = `*🔥 Trending Tokens - Volume Leaders*\n\n`;

			volumeLeaders.forEach((token: any, index: number) => {
				const priceChange =
					token.priceChange24hPercentage > 0
						? `+${token.priceChange24hPercentage.toFixed(2)}% ↗️`
						: `${token.priceChange24hPercentage.toFixed(2)}% ↘️`;

				message +=
					`${index + 1}. *${token.symbol}*: ${FormatUtils.formatCurrency(
						token.price,
					)} | ${priceChange}\n` +
					`   Vol: ${FormatUtils.formatCurrency(token.volume24h)}\n`;
			});

			// Update the message with volume leaders
			await ctx.api.editMessageText(
				loadingMessage.chat.id,
				loadingMessage.message_id,
				message,
				{
					parse_mode: "Markdown",
				},
			);

			// Send top gainers in a separate message
			let gainersMessage = `*📈 Top Gainers - 24h Price Change*\n\n`;

			priceGainers.forEach((token: any, index: number) => {
				gainersMessage +=
					`${index + 1}. *${token.symbol}*: ${FormatUtils.formatCurrency(
						token.price,
					)} | ` + `+${token.priceChange24hPercentage.toFixed(2)}% ↗️\n`;
			});

			await ctx.reply(gainersMessage, {
				parse_mode: "Markdown",
			});

			try {
				const top5VolumeTokens = volumeLeaders.slice(0, 5);

				const labels = top5VolumeTokens.map((t: any) => t.symbol);
				const values = top5VolumeTokens.map((t: any) => t.volume24h);

				const chartData = ChartService.formatComparisonData(
					labels,
					values,
					"24h Volume (USD)",
				);
	const chartTitle = "Top Tokens by 24h Trading Volume";
				const chartBuffer = await ChartService.generateBarChart(
					chartData,
					chartTitle,
				);
	await ctx.replyWithPhoto(new InputFile(chartBuffer), {
					caption: "*Top Trading Volume*\nHighest 24h trading volume tokens",
					parse_mode: "Markdown",
				});
			} catch (chartError) {
					console.error("Error generating trending chart:", chartError);
			}

			await ctx.reply(
				"*Want more details?*\n\n" +
					"Try these commands:\n" +
					"• `/token SYMBOL` - Get detailed token info\n" +
					"• `/price SYMBOL` - See price chart\n" +
					"• `/whales SYMBOL` - Track large transfers\n\n" +
					`[View all tokens on AlphaVybe](${MessageUtils.createAlphaVybeUrl(
						"/tokens",
					)})`,
				{
					parse_mode: "Markdown",
					},
			);
		} catch (error) {
			await ctx.api.editMessageText(
				loadingMessage.chat.id,
				loadingMessage.message_id,
				MessageUtils.formatErrorMessage(error),
				{ parse_mode: "Markdown" },
			);
		}
	} catch (error) {
		await ctx.reply(MessageUtils.formatErrorMessage(error), {
			parse_mode: "Markdown",
		});
	}
};
