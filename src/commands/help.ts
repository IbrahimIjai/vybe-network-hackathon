import { CommandContext, Context } from "grammy";
import { MessageUtils } from "../utils/message";

export const handleHelpCommand = async (
	ctx: CommandContext<Context>,
): Promise<void> => {
	try {
		const helpMessage = MessageUtils.formatHelpMessage();

		await ctx.reply(helpMessage, {
			parse_mode: "MarkdownV2",
		});
	} catch (error) {
		console.error("Error handling help command:", error);
		await ctx.reply(
			"An error occurred while displaying help information. Please try again later.",
		);
	}
};
