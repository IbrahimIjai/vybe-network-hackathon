import { CommandContext, Context, InputFile } from "grammy";
import { VybeApi } from "../api/vybe";
import { MessageUtils } from "../utils/message";
import { FormatUtils } from "../utils/format";
import { ChartService } from "../services/chart";

// This command compares metrics between multiple tokens

export const handleCompareCommand = async (
	ctx: CommandContext<Context>,
): Promise<void> => {
	try {
		const input = ctx.match;

		if (!input) {
			await ctx.reply(
				"Please provide tokens to compare. Example: `/compare SOL,BTC,ETH`",
				{
					parse_mode: "Markdown",
				},
			);
			return;
		}

		const tokenInputs = input
			.split(",")
			.map((t) => t.trim())
			.filter((t) => t.length > 0);

		if (tokenInputs.length < 2) {
			await ctx.reply("Please provide at least 2 tokens to compare.", {
				parse_mode: "Markdown",
			});
			return;
		}

		const tokensToCompare = tokenInputs.slice(0, 5);

		// Show loading message
		const loadingMessage = await ctx.reply(
			`Comparing ${tokensToCompare.join(", ")}...`,
		);

		try {
			const tokenPromises = tokensToCompare.map(async (tokenInput) => {
				try {
					if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenInput)) {
						return await VybeApi.getTokenDetails(tokenInput);
					} else {
						const tokens = await VybeApi.getTokensList();
						const token = tokens.find(
							(t: any) =>
								t.symbol?.toLowerCase() === tokenInput.toLowerCase() ||
								t.name?.toLowerCase() === tokenInput.toLowerCase(),
						);

						if (!token) {
							return null;
						}

						return await VybeApi.getTokenDetails(token.mintAddress);
					}
				} catch (error) {
					console.error(
						`Error fetching token details for ${tokenInput}:`,
						error,
					);
					return null;
				}
			});

			const tokenDetails = (await Promise.all(tokenPromises)).filter(
				(t) => t !== null,
			);

			if (tokenDetails.length < 2) {
				await ctx.api.editMessageText(
					loadingMessage.chat.id,
					loadingMessage.message_id,
					"Could not find at least 2 valid tokens to compare. Please check your input and try again.",
				);
				return;
			}

			let message = `*Token Comparison*\n\n`;

			message += `*Price:*\n`;
			tokenDetails.forEach((token) => {
				message += `• ${token.symbol}: ${FormatUtils.formatCurrency(
					token.price,
				)}\n`;
			});

			message += `\n*Market Cap:*\n`;
			tokenDetails.forEach((token) => {
				message += `• ${token.symbol}: ${FormatUtils.formatCurrency(
					token.marketCap,
				)}\n`;
			});

			message += `\n*24h Volume:*\n`;
			tokenDetails.forEach((token) => {
				message += `• ${token.symbol}: ${FormatUtils.formatCurrency(
					token.volume24h,
				)}\n`;
			});

			message += `\n*24h Price Change:*\n`;
			tokenDetails.forEach((token) => {
				const priceChange =
					token.priceChange24hPercentage > 0
						? `+${token.priceChange24hPercentage.toFixed(2)}% ↗️`
						: `${token.priceChange24hPercentage.toFixed(2)}% ↘️`;

				message += `• ${token.symbol}: ${priceChange}\n`;
			});

			message += `\n*Holders Count:*\n`;
			tokenDetails.forEach((token) => {
				message += `• ${token.symbol}: ${FormatUtils.formatNumber(
					token.holdersCount,
					0,
				)}\n`;
			});

			await ctx.api.editMessageText(
				loadingMessage.chat.id,
				loadingMessage.message_id,
				message,
				{
					parse_mode: "Markdown",
				},
			);

			try {
				try {
					const priceDataPromises = tokenDetails.map((token) =>
						VybeApi.getTokenPrice(token.mintAddress, "1d", 7),
					);

					const allPriceData = await Promise.all(priceDataPromises);

					if (
						allPriceData.filter((data) => data && data.length > 0).length >= 2
					) {
						const normalizedPriceData = allPriceData
							.map((priceData, index) => {
								if (!priceData || priceData.length === 0) return null;

								const basePrice = priceData[0].close;

								return {
									symbol: tokenDetails[index].symbol,
									data: priceData.map((p) => ({
										time: p.time,
										normalizedPrice: (p.close / basePrice - 1) * 100, // % change
									})),
								};
							})
							.filter((d) => d !== null);

						const datasets = normalizedPriceData.map((tokenData, index) => {
							const colors = [
								"rgb(255, 99, 132)",
								"rgb(54, 162, 235)",
								"rgb(255, 206, 86)",
								"rgb(75, 192, 192)",
								"rgb(153, 102, 255)",
							];

							return {
								label: tokenData.symbol,
								data: tokenData.data.map((d) => d.normalizedPrice),
								borderColor: colors[index % colors.length],
								backgroundColor: "transparent",
							};
						});

						const chartData = {
							labels: normalizedPriceData[0].data.map((d) =>
								new Date(d.time * 1000).toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
								}),
							),
							datasets,
						};

						const chartTitle = "Price Change Comparison (%)";
						const chartBuffer = await ChartService.generateLineChart(
							chartData,
							chartTitle,
						);

						await ctx.replyWithPhoto(new InputFile(chartBuffer), {
							caption:
								"*Price Performance Comparison*\nPercentage change over 7 days",
							parse_mode: "Markdown",
						});
					}
				} catch (priceChartError) {
					console.error(
						"Error generating price comparison chart:",
						priceChartError,
					);
				}

				try {
					const symbols = tokenDetails.map((t) => t.symbol);
					const volumes = tokenDetails.map((t) => t.volume24h);

					const volumeChartData = ChartService.formatComparisonData(
						symbols,
						volumes,
						"24h Volume (USD)",
					);

					const volumeChartTitle = "Trading Volume Comparison";
					const volumeChartBuffer = await ChartService.generateBarChart(
						volumeChartData,
						volumeChartTitle,
					);

					await ctx.replyWithPhoto(new InputFile(volumeChartBuffer), {
						caption: "*Trading Volume Comparison*\n24h trading volume in USD",
						parse_mode: "Markdown",
					});
				} catch (volumeChartError) {
					console.error(
						"Error generating volume comparison chart:",
						volumeChartError,
					);
				}

				try {
					const symbols = tokenDetails.map((t) => t.symbol);
					const marketCaps = tokenDetails.map((t) => t.marketCap);

					const marketCapChartData = ChartService.formatComparisonData(
						symbols,
						marketCaps,
						"Market Cap (USD)",
					);
					const marketCapChartTitle = "Market Cap Comparison";
					const marketCapChartBuffer = await ChartService.generateBarChart(
						marketCapChartData,
						marketCapChartTitle,
					);

					await ctx.replyWithPhoto(new InputFile(marketCapChartBuffer), {
						caption:
							"*Market Cap Comparison*\nTotal market capitalization in USD",
						parse_mode: "Markdown",
					});
				} catch (marketCapChartError) {
					console.error(
						"Error generating market cap comparison chart:",
						marketCapChartError,
					);
				}
			} catch (chartsError) {
				console.error("Error generating comparison charts:", chartsError);
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
