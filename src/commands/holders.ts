import { CommandContext, Context, InputFile } from "grammy";
import { VybeApi } from "../api/vybe";
import { MessageUtils } from "../utils/message";
import { FormatUtils } from "../utils/format";
import { ChartService } from "../services/chart";
import { InlineKeyboard } from "grammy";

interface TokenHolder {
	rank: number;
	ownerAddress: string;
	ownerName: string | null;
	ownerLogoUrl: string | null;
	tokenMint: string;
	tokenSymbol: string;
	tokenLogoUrl: string;
	balance: string;
	valueUsd: string;
	percentageOfSupplyHeld: number;
}

// This command shows the top holders for a given token and distribution metrics

export const handleHoldersCommand = async (
	ctx: CommandContext<Context>,
): Promise<void> => {
	try {
		// Get the command arguments
		const args = ctx.match.trim();

		if (!args) {
			await ctx.reply(
				"Please provide a token address. Usage: /holders [token_address]",
			);
			return;
		}

		// Show loading message
		const loadingMsg = await ctx.reply("Loading holder information...");

		try {
			// Fetch holders data
			const response = await VybeApi.getTopHolders(args, 20);
			const holdersData = response as unknown as TokenHolder[];


			if (!holdersData || holdersData.length === 0) {
				await ctx.api.editMessageText(
					loadingMsg.chat.id,
					loadingMsg.message_id,
					"No holder data available for this token.",
					{
						reply_markup: new InlineKeyboard().text(
							"« Back to Tokens",
							"back_to_tokens",
						),
					},
				);
				return;
			}

			// Create message with holders information
			let message = `*Top Holders for ${holdersData[0].tokenSymbol}*\n\n`;

			// Add table header
			message += "```\n";
			message += "Rank | Address        | Balance      | USD Value\n";
			message += "-----|---------------|--------------|------------\n";

			// Add holder rows
			holdersData.forEach((holder: TokenHolder) => {
				if (parseFloat(holder.balance) > 0) {
					// Only show holders with balance
					const rank = holder.rank.toString().padEnd(4, " ");
					const address =
						holder.ownerAddress.slice(0, 8) +
						"..." +
						holder.ownerAddress.slice(-4);
					const balance = FormatUtils.formatNumber(
						parseFloat(holder.balance),
					).padEnd(12, " ");
					const usdValue = FormatUtils.formatCurrency(
						parseFloat(holder.valueUsd),
					).padEnd(10, " ");

					message += `${rank}| ${address} | ${balance} | ${usdValue}\n`;
				}
			});

			message += "```\n\n";
			message += `*Total top Holders :* ${
				holdersData.filter((h: TokenHolder) => parseFloat(h.balance) > 0).length
			}\n`;
			message += `*Top Holder %:* ${holdersData[0].percentageOfSupplyHeld.toFixed(
				2,
			)}%\n\n`;

			message += "🔍 *Pro Tip:*\n";
			message += "```\n/holders [address]\n```\n";
			message += "Use this command to check holders of any token! 📊\n";

			// Create keyboard with back button
			const keyboard = new InlineKeyboard().text(
				"« Back to Token",
				`token_details:${args}`,
			);

			// Update loading message with holders information
			await ctx.api.editMessageText(
				loadingMsg.chat.id,
				loadingMsg.message_id,
				message,
				{
					parse_mode: "Markdown",
					reply_markup: keyboard,
				},
			);

			try {
				// Create chart data for top 10 holders
				const holders = holdersData.slice(0, 10);
				const chartData = {
					labels: holders.map(
						(holder: TokenHolder) =>
							`${holder.ownerAddress.slice(0, 4)}...${holder.ownerAddress.slice(
								-4,
							)}`,
					),
					datasets: [
						{
							label: "Supply Percentage",
							data: holders.map(
								(holder: TokenHolder) => holder.percentageOfSupplyHeld,
							),
							backgroundColor: [
								"rgba(255, 99, 132, 0.5)",
								"rgba(54, 162, 235, 0.5)",
								"rgba(255, 206, 86, 0.5)",
								"rgba(75, 192, 192, 0.5)",
								"rgba(153, 102, 255, 0.5)",
								"rgba(255, 159, 64, 0.5)",
								"rgba(199, 199, 199, 0.5)",
								"rgba(83, 102, 255, 0.5)",
								"rgba(255, 159, 12, 0.5)",
								"rgba(78, 78, 78, 0.5)",
							],
						},
					],
				};

				// Generate chart
				const chartTitle = `${holdersData[0].tokenSymbol} - Top Holders Distribution`;
				const chartBuffer = await ChartService.generatePieChart(
					chartData,
					chartTitle,
				);

				// Send chart
				await ctx.replyWithPhoto(new InputFile(chartBuffer), {
					caption: `*${holdersData[0].tokenSymbol} Distribution*\nSupply distribution among top holders.`,
					parse_mode: "Markdown",
				});
			} catch (error) {
				console.error("Error generating holders chart:", error);
			}

			try {
				const holdersTimeSeries = await VybeApi.getTokenHoldersTimeSeries(
					args,
					"1d",
				);

				if (holdersTimeSeries && holdersTimeSeries.length > 0) {
					const chartData = holdersTimeSeries.map((point: any) => ({
						time: new Date(point.timestamp),
						value: point.holdersCount,
					}));

					const timeSeriesTitle = `${holdersData[0].tokenSymbol} - Holders Count History`;
					const timeSeriesBuffer = await ChartService.generateLineChart(
						chartData,
						timeSeriesTitle,
					);

					// Send chart
					await ctx.replyWithPhoto(new InputFile(timeSeriesBuffer), {
						caption: `*${holdersData[0].tokenSymbol} Holders Growth*\nNumber of holders over time.`,
						parse_mode: "Markdown",
					});
				}
			} catch (error) {
				console.error("Error generating holders time series chart:", error);
			}
		} catch (error) {
			await ctx.api.editMessageText(
				loadingMsg.chat.id,
				loadingMsg.message_id,
				MessageUtils.formatErrorMessage(error),
				{ parse_mode: "Markdown" },
			);
		}
	} catch (error) {
		console.error("Error handling holders command:", error);
		await ctx.reply(
			"An error occurred while processing the command. Please try again.",
		);
	}
};
