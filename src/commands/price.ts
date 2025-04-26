import { CommandContext, Context, InputFile } from "grammy";
import { VybeApi } from "../api/vybe";
import { MessageUtils } from "../utils/message";
import { ChartService } from "../services/chart";

// This command provides a price chart for a token using its symbol or address

export const handlePriceCommand = async (
	ctx: CommandContext<Context>,
): Promise<void> => {
	try {
		const args = ctx.match?.trim().split(/\s+/) || [];

		if (args.length === 0 || !args[0]) {
			await ctx.reply(
				"Please provide a token symbol or mint address. Example: `/price SOL 7d`",
				{
					parse_mode: "Markdown",
				},
			);
			return;
		}

		const tokenInput = args[0];
	let days = 7;
		let resolution = "1d";

		if (args.length > 1) {
			const timePeriod = args[1].toLowerCase();

			if (timePeriod === "24h" || timePeriod === "1d") {
				days = 1;
				resolution = "1h";
			} else if (timePeriod === "7d") {
				days = 7;
				resolution = "1d";
			} else if (timePeriod === "30d" || timePeriod === "1m") {
				days = 30;
				resolution = "1d";
			} else if (timePeriod === "90d" || timePeriod === "3m") {
				days = 90;
				resolution = "1d";
			} else {
				const parsedDays = parseInt(timePeriod);
				if (!isNaN(parsedDays) && parsedDays > 0) {
					days = parsedDays;
					resolution = parsedDays <= 7 ? "1h" : "1d";
				}
			}
		}

	const loadingMessage = await ctx.reply(
			`Generating price chart for ${tokenInput}...`,
		);

		try {
			let mintAddress: string;
			let tokenDetails: any;

			if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenInput)) {
				mintAddress = tokenInput;
				tokenDetails = await VybeApi.getTokenDetails(mintAddress);
			} else {
				const tokens = await VybeApi.getTokensList();
				const token = tokens.find(
					(t: any) =>
						t.symbol?.toLowerCase() === tokenInput.toLowerCase() ||
						t.name?.toLowerCase() === tokenInput.toLowerCase(),
				);

				if (!token) {
					await ctx.api.editMessageText(
						loadingMessage.chat.id,
						loadingMessage.message_id,
						`Token not found: ${tokenInput}. Please check the symbol or mint address and try again.`,
					);
					return;
				}

				mintAddress = token.mintAddress;
				tokenDetails = await VybeApi.getTokenDetails(mintAddress);
			}

			const priceData = await VybeApi.getTokenPrice(
				mintAddress,
				resolution,
				days,
			);

			if (!priceData || priceData.length === 0) {
				await ctx.api.editMessageText(
					loadingMessage.chat.id,
					loadingMessage.message_id,
					`No price data available for ${tokenDetails.name} (${tokenDetails.symbol}).`,
				);
				return;
			}

			const chartData = ChartService.formatTokenPriceHistory(priceData);

			// Generate chart
			const chartTitle = `${tokenDetails.name} (${tokenDetails.symbol}) - Last ${days} days`;
			const chartBuffer = await ChartService.generateLineChart(
				chartData,
				chartTitle,
			);

			// Delete loading message
			await ctx.api.deleteMessage(
				loadingMessage.chat.id,
				loadingMessage.message_id,
			);

			// Format caption for the chart
			const caption = MessageUtils.formatPriceChartMessage(tokenDetails, days);

	
			await ctx.replyWithPhoto(new InputFile(chartBuffer), {
				caption,
				parse_mode: "Markdown",
			});
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
