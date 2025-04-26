import { CommandContext } from "grammy";
import { MessageUtils } from "../utils/message";
import { MyContext } from "../types/session";

export const handleHelpCommand = async (
	ctx: CommandContext<MyContext>,
): Promise<void> => {
	try {
		const helpMessage = MessageUtils.formatHelpMessage();

		await ctx.reply(helpMessage, {
			parse_mode: "Markdown",
		});
	} catch (error) {
		console.error("Error handling help command:", error);
		await ctx.reply(
			"An error occurred while displaying help information. Please try again later.",
		);
	}
};
