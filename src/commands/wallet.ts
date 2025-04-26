import { CommandContext, Context } from "grammy";
import { VybeApi } from "../api/vybe";
import { MessageUtils } from "../utils/message";
import { ChartService } from "../services/chart";
import { FormatUtils } from "../utils/format";
import { InputFile } from "grammy";

/**
 * Handle the /wallet command
 *
 * This command provides detailed wallet token holdings and allows time series analysis
 */
export const handleWalletCommand = async (
	ctx: CommandContext<Context>,
): Promise<void> => {
	try {
		// Parse the command input
		const input = ctx.match;

		if (!input) {
			await ctx.reply(
				"Please provide a wallet address. Example: `/wallet ADDRESS`",
				{
					parse_mode: "Markdown",
				},
			);
			return;
		}

		// Check if the input looks like a Solana address
		if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input)) {
			await ctx.reply(
				"Invalid Solana address format. Please provide a valid address.",
				{
					parse_mode: "Markdown",
				},
			);
			return;
		}

		// Show loading message
		const loadingMessage = await ctx.reply("Fetching wallet data...");

		try {
			// Get token balances
			const walletData = await VybeApi.getTokenBalance(input);

			if (
				!walletData ||
				!walletData.balances ||
				walletData.balances.length === 0
			) {
				await ctx.api.editMessageText(
					loadingMessage.chat.id,
					loadingMessage.message_id,
					"No token balances found for this wallet.",
				);
				return;
			}

			// Format token balances message
			const message = MessageUtils.formatTokenBalancesMessage(
				walletData.balances,
				walletData.totalUsdValue,
			);

			// Update the message with balances
			await ctx.api.editMessageText(
				loadingMessage.chat.id,
				loadingMessage.message_id,
				message,
				{
					parse_mode: "Markdown",
				},
			);

			try {
				const sortedBalances = [...walletData.balances]
					.filter((token) => token.usdValue > 0)
					.sort((a, b) => b.usdValue - a.usdValue);
				const topTokens = sortedBalances.slice(0, 8);
				const otherTokens = sortedBalances.slice(8);

				const labels = topTokens.map((token) => token.symbol);
				const values = topTokens.map((token) => token.usdValue);

				if (otherTokens.length > 0) {
					const othersValue = otherTokens.reduce(
						(sum, token) => sum + token.usdValue,
						0,
					);
					labels.push("Others");
					values.push(othersValue);
				}

				const chartData = {
					labels,
					datasets: [
						{
							label: "USD Value",
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
								"rgba(78, 78, 78, 0.5)",
							],
						},
					],
				};

				const chartTitle = `Portfolio Distribution - ${FormatUtils.truncateAddress(
					input,
				)}`;
				const chartBuffer = await ChartService.generatePieChart(
					chartData,
					chartTitle,
				);

				await ctx.replyWithPhoto(new InputFile(chartBuffer), {
					caption: `*Portfolio Distribution*\n💰 Total Value: ${FormatUtils.formatCurrency(
						walletData.totalUsdValue,
					)}`,
					parse_mode: "Markdown",
				});
			} catch (chartError) {
				console.error("Error generating portfolio chart:", chartError);
			}

			try {
				const historicalData = await VybeApi.getTokenBalanceTimeSeries(
					input,
					30,
				);

				if (historicalData && historicalData.length > 0) {
					const dates = historicalData.map((entry: any) => entry.date);
					const values = historicalData.map(
						(entry: any) => entry.totalUsdValue,
					);

					if (dates.length >= 2) {
						const timeSeriesData = {
							labels: dates.map((date: string) => date.substring(5)),
							datasets: [
								{
									label: "Portfolio Value (USD)",
									data: values,
									borderColor: "rgb(75, 192, 192)",
									backgroundColor: "rgba(75, 192, 192, 0.2)",
								},
							],
						};

						const timeSeriesTitle = `Portfolio Value - Last 30 Days`;
						const timeSeriesBuffer = await ChartService.generateLineChart(
							timeSeriesData,
							timeSeriesTitle,
						);

						await ctx.replyWithPhoto(new InputFile(timeSeriesBuffer), {
							caption:
								"*Portfolio Value History*\nView trends over the last 30 days.",
							parse_mode: "Markdown",
						});
					}
				}
			} catch (historyError) {
				console.error("Error fetching historical data:", historyError);
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
