import { CommandContext, Context, InputFile } from "grammy";
import { VybeApi } from "../api/vybe";
import { MessageUtils } from "../utils/message";
import { FormatUtils } from "../utils/format";
import { ChartService } from "../services/chart";

// This command shows the top holders for a given token and distribution metrics

export const handleHoldersCommand = async (
	ctx: CommandContext<Context>,
): Promise<void> => {
	try {
		const input = ctx.match;

		if (!input) {
			await ctx.reply(
				"Please provide a token symbol or mint address. Example: `/holders SOL`",
				{
					parse_mode: "Markdown",
				},
			);
			return;
		}

		const loadingMessage = await ctx.reply("Fetching token holders data...");

		try {
			let mintAddress: string;
			let tokenSymbol: string;
			let tokenName: string;

			if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input)) {
				mintAddress = input;
				const tokenDetails = await VybeApi.getTokenDetails(mintAddress);
				tokenSymbol = tokenDetails.symbol;
				tokenName = tokenDetails.name;
			} else {
				const tokens = await VybeApi.getTokensList();
				const token = tokens.find(
					(t: any) =>
						t.symbol?.toLowerCase() === input.toLowerCase() ||
						t.name?.toLowerCase() === input.toLowerCase(),
				);

				if (!token) {
					await ctx.api.editMessageText(
						loadingMessage.chat.id,
						loadingMessage.message_id,
						`Token not found: ${input}. Please check the symbol or mint address and try again.`,
					);
					return;
				}

				mintAddress = token.mintAddress;
				tokenSymbol = token.symbol;
				tokenName = token.name;
			}

			const holdersData = await VybeApi.getTopHolders(mintAddress, 20);

			if (
				!holdersData ||
				!holdersData.holders ||
				holdersData.holders.length === 0
			) {
				await ctx.api.editMessageText(
					loadingMessage.chat.id,
					loadingMessage.message_id,
					`No holder data available for ${tokenSymbol}.`,
				);
				return;
			}

			let message = `*Top Holders for ${tokenName} (${tokenSymbol})*\n\n`;

			const topHolders = holdersData.holders.slice(0, 10);

			topHolders.forEach((holder, index) => {
				const holderName =
					holder.ownerName || FormatUtils.truncateAddress(holder.ownerAddress);
				message +=
					`${index + 1}. *${holderName}*\n` +
					`   ${FormatUtils.formatPercentage(
						holder.percentage,
						2,
					)} of supply | ` +
					`${FormatUtils.formatCurrency(holder.usdValue)}\n`;
			});

			// Calculate concentration metrics
			const top3Percentage = holdersData.holders
				.slice(0, 3)
				.reduce((sum, h) => sum + h.percentage, 0);

			const top10Percentage = holdersData.holders
				.slice(0, 10)
				.reduce((sum, h) => sum + h.percentage, 0);

			message +=
				`\n*Distribution Metrics:*\n` +
				`• Top 3 holders: ${FormatUtils.formatPercentage(
					top3Percentage,
					2,
				)} of supply\n` +
				`• Top 10 holders: ${FormatUtils.formatPercentage(
					top10Percentage,
					2,
				)} of supply\n`;

			const tokenDetails = await VybeApi.getTokenDetails(mintAddress);

			if (tokenDetails.holdersCount) {
				message += `• Total holders: ${FormatUtils.formatNumber(
					tokenDetails.holdersCount,
					0,
				)}\n`;
			}

			message += `\n[View on AlphaVybe](${MessageUtils.createAlphaVybeUrl(
				`/token/${mintAddress}`,
			)})`;

			await ctx.api.editMessageText(
				loadingMessage.chat.id,
				loadingMessage.message_id,
				message,
				{
					parse_mode: "Markdown",
					// link_preview_options:""
					// disable_web_page_preview: true,
				},
			);

			// Generate distribution chart
			try {
				// Create chart data for top 10 holders
				const holders = holdersData.holders.slice(0, 10);

				const top10Supply = holders.reduce((sum, h) => sum + h.percentage, 0);
				const othersPercentage = 100 - top10Supply;

				const labels = holders.map(
					(h) => h.ownerName || FormatUtils.truncateAddress(h.ownerAddress),
				);
				const values = holders.map((h) => h.percentage);

				// Add "Others" category
				if (othersPercentage > 0) {
					labels.push("Others");
					values.push(othersPercentage);
				}

				// Create chart data
				const chartData = {
					labels,
					datasets: [
						{
							label: "Supply Percentage",
							data: values,
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
								"rgba(189, 189, 189, 0.5)",
							],
						},
					],
				};

				// Generate chart
				const chartTitle = `${tokenSymbol} - Top Holders Distribution`;
				const chartBuffer = await ChartService.generatePieChart(
					chartData,
					chartTitle,
				);

				// Send chart
				await ctx.replyWithPhoto(new InputFile(chartBuffer), {
					caption: `*${tokenSymbol} Distribution*\nSupply distribution among top holders.`,
					parse_mode: "Markdown",
				});
			} catch (chartError) {
				// If chart generation fails, continue without chart
				console.error("Error generating holders chart:", chartError);
			}

			// Try to get holders time series data
			try {
				const holdersTimeSeries = await VybeApi.getTokenHoldersTimeSeries(
					mintAddress,
					"1d",
				);

				if (holdersTimeSeries && holdersTimeSeries.length > 1) {
					const chartData = ChartService.formatTimeSeriesData(
						holdersTimeSeries,
						"holdersCount",
						"time",
						"Holder Count",
					);

					const timeSeriesTitle = `${tokenSymbol} - Holders Count History`;
					const timeSeriesBuffer = await ChartService.generateLineChart(
						chartData,
						timeSeriesTitle,
					);

					// Send chart
					await ctx.replyWithPhoto(new InputFile(timeSeriesBuffer), {
						caption: `*${tokenSymbol} Holders Growth*\nNumber of holders over time.`,
						parse_mode: "Markdown",
					});
				}
			} catch (timeSeriesError) {
				console.error(
					"Error generating holders time series chart:",
					timeSeriesError,
				);
			}
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
