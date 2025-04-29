import { CommandContext, Context, InputFile } from "grammy";
import { VybeApi } from "../api/vybe";
import { MessageUtils } from "../utils/message";
import { FormatUtils } from "../utils/format";
import { ChartService } from "../services/chart";
import { InlineKeyboard } from "grammy";
import { Program } from "../types/api";

interface ProgramDetails {
	programId: string;
	name: string;
	idlUrl: string | null;
	labels: string[];
	logoUrl: string | null;
	friendlyName: string;
	dau: number;
	newUsersChange1d: number;
	transactions1d: number;
	instructions1d: number;
	entityName: string;
	programDescription: string;
	programDetail: string | null;
}

interface ProgramActiveUser {
	programId: string;
	wallet: string;
	transactions: number;
	instructions: number;
}

// This command shows program details and active users for a given program
export const handleProgramCommand = async (
	ctx: CommandContext<Context>,
): Promise<void> => {
	try {
		// Get the command arguments
		const args = ctx.match.trim();

		if (!args) {
			await ctx.reply(
				"Please provide a program address. Usage: /program [program_address]",
			);
			return;
		}

		// Show loading message
		const loadingMsg = await ctx.reply("Loading program information...");

		try {
			// Fetch program details
			const programDetails = await VybeApi.getProgramDetails(args);

			if (!programDetails) {
				await ctx.api.editMessageText(
					loadingMsg.chat.id,
					loadingMsg.message_id,
					"No program data available for this address.",
					{
						reply_markup: new InlineKeyboard().text(
							"« Back to Programs",
							"back_to_programs",
						),
					},
				);
				return;
			}

			// Create message with program information
			let message = `*${programDetails.name}*\n\n`;

			// Add program ID
			message += `*Program ID:* \`${programDetails.programId}\`\n\n`;

			// Add description if available
			if (programDetails.programDescription) {
				message += `*Description:*\n${programDetails.programDescription}\n\n`;
			}

			// Add entity name if available
			if (programDetails.entityName) {
				message += `*Entity:* ${programDetails.entityName}\n\n`;
			}

			// Add friendly name if available
			if (programDetails.friendlyName) {
				message += `*Friendly Name:* ${programDetails.friendlyName}\n\n`;
			}

			// Add labels if available
			if (programDetails.labels && programDetails.labels.length > 0) {
				message += `*Categories:* ${programDetails.labels.join(", ")}\n\n`;
			}

			// Add usage statistics
			message += `*Usage Statistics (24h):*\n`;
			message += `• Daily Active Users: ${FormatUtils.formatNumber(
				programDetails.dau || 0,
			)}\n`;
			message += `• New Users  +: ${FormatUtils.formatNumber(
				programDetails.newUsersChange1d || 0,
			)}\n`;
			message += `• Transactions: ${FormatUtils.formatNumber(
				programDetails.transactions1d || 0,
			)}\n`;
			message += `• Instructions: ${FormatUtils.formatNumber(
				programDetails.instructions1d || 0,
			)}\n`;

			message += `\n`;

			// Add pro tip
			message += "🔍 *Pro Tip:*\n";
			message += "```\n/program [address]\n```\n";
			message +=
				"Use this command to check details of any Solana program! 🔧\n";

			// Create keyboard with back button
			const keyboard = new InlineKeyboard()
				.text("« Back to Programs", "back_to_programs")
				.row()
				.text("📊 Active Users", `program_users:${args}`);

			// Update loading message with program details
			await ctx.api.editMessageText(
				loadingMsg.chat.id,
				loadingMsg.message_id,
				message,
				{
					parse_mode: "Markdown",
					reply_markup: keyboard,
				},
			);

			// Send logo as a separate message if available
			if (programDetails.logoUrl) {
				await ctx.reply(`Program Logo: ${programDetails.logoUrl}`);
			}

			// Fetch and display active users
			try {
				const activeUsers = await VybeApi.getProgramActiveUsers(args);

				if (activeUsers && activeUsers.length > 0) {
					// Create message for active users
					let usersMessage = `*Top Active Users for ${programDetails.name}*\n\n`;

					// Add table header
					usersMessage += "```\n";
					usersMessage += "*Top users by Transaction number*\n";
					usersMessage +=
						"Rank | Address        | Transactions | Instructions\n";
					usersMessage +=
						"-----|---------------|--------------|-------------\n";

					// Add user rows (top 10)
					activeUsers.slice(0, 10).forEach((user: any, index: number) => {
						const rank = (index + 1).toString().padEnd(4, " ");
						const address =
							user.wallet.slice(0, 8) + "..." + user.wallet.slice(-4);
						const transactions = FormatUtils.formatNumber(
							user.transactions,
						).padEnd(12, " ");
						const instructions = FormatUtils.formatNumber(
							user.instructions,
						).padEnd(11, " ");

						usersMessage += `${rank}| ${address} | ${transactions} | ${instructions}\n`;
					});

					usersMessage += "```\n\n";
					usersMessage += `*Total Active Users:* ${activeUsers.length}\n\n`;

					// Create keyboard with back button
					const usersKeyboard = new InlineKeyboard().text(
						"« Back to Program",
						`program_details:${args}`,
					);

					// Send active users message
					await ctx.reply(usersMessage, {
						parse_mode: "Markdown",
						reply_markup: usersKeyboard,
					});
				}
			} catch (error) {
				console.error("Error fetching program active users:", error);
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
		console.error("Error handling program command:", error);
		await ctx.reply(
			"An error occurred while processing the command. Please try again.",
		);
	}
};
