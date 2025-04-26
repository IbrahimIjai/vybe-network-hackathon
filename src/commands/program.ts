import { CommandContext, Context, InputFile } from "grammy";
import { VybeApi } from "../api/vybe";
import { MessageUtils } from "../utils/message";
import { ChartService } from "../services/chart";

// This command provides detailed information about a Solana program
 
export const handleProgramCommand = async (
	ctx: CommandContext<Context>,
): Promise<void> => {
	try {
		// Parse command input
		const input = ctx.match;

		if (!input) {
			await ctx.reply(
				"Please provide a program ID. Example: `/program ADDRESS`",
				{
					parse_mode: "Markdown",
				},
			);
			return;
		}

		if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input)) {
			const programs = await VybeApi.getProgramsList();
			const program = programs.find(
				(p) => p.name?.toLowerCase() === input.toLowerCase(),
			);

			if (!program) {
				await ctx.reply(
					"Program not found. Please provide a valid program ID or name.",
					{
						parse_mode: "Markdown",
					},
				);
				return;
			}

			return handleProgramCommand({
				...ctx,
				match: program.programId,
			} as CommandContext<Context>);
		}

		const loadingMessage = await ctx.reply("Fetching program details...");

		try {
						const programDetails = await VybeApi.getProgramDetails(input);

			if (!programDetails) {
				await ctx.api.editMessageText(
					loadingMessage.chat.id,
					loadingMessage.message_id,
					"Program not found. Please check the ID and try again.",
				);
				return;
			}

			const message = MessageUtils.formatProgramDetailsMessage(programDetails);

			await ctx.api.editMessageText(
				loadingMessage.chat.id,
				loadingMessage.message_id,
				message,
				{
					parse_mode: "Markdown",
					// disable_web_page_preview: true,
				},
			);

			try {
				const tvlData = await VybeApi.getProgramTVL(input, "1d");

				if (tvlData && tvlData.length > 0) {
					const chartData = ChartService.formatTimeSeriesData(
						tvlData,
						"tvl",
						"time",
						"TVL (USD)",
					);

					const chartTitle = `${
						programDetails.name || "Program"
					} - TVL History`;
					const chartBuffer = await ChartService.generateLineChart(
						chartData,
						chartTitle,
					);

					await ctx.replyWithPhoto(new InputFile(chartBuffer), {
						caption: `*TVL History for ${
							programDetails.name || "Program"
						}*\nTotal Value Locked over time.`,
						parse_mode: "Markdown",
					});
				}

				const activeUsersData = await VybeApi.getProgramActiveUsersTimeSeries(
					input,
					"7d",
				);

				if (activeUsersData && activeUsersData.length > 0) {
					const usersChartData = ChartService.formatTimeSeriesData(
						activeUsersData,
						"activeUsers",
						"timestamp",
						"Active Users",
					);

					const usersChartTitle = `${
						programDetails.name || "Program"
					} - Active Users`;
					const usersChartBuffer = await ChartService.generateLineChart(
						usersChartData,
						usersChartTitle,
					);

					await ctx.replyWithPhoto(new InputFile(usersChartBuffer), {
						caption: `*Active Users for ${
							programDetails.name || "Program"
						}*\nDaily active users over time.`,
						parse_mode: "Markdown",
					});
				}
			} catch (chartError) {
				console.error("Error generating program charts:", chartError);
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
