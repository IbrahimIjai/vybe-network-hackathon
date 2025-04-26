import { CommandContext } from "grammy";
import { MyContext } from "../types/session";
import config from "../config";

export const handleHelpCommand = async (
	ctx: CommandContext<MyContext>,
): Promise<void> => {
	try {
		const helpMessage = `
<b>🤖 Vybe Analytics Bot</b>

Get real-time on-chain analytics for Solana tokens, accounts, and programs.

<b>Available Commands:</b>

/token &lt;symbol/address&gt; - Get detailed token information
/price &lt;symbol/address&gt; - Get token price chart
/wallet &lt;address&gt; - Get wallet token holdings
/holders &lt;symbol/address&gt; - Get top token holders
/whales &lt;symbol/address&gt; - Track large token transfers
/program &lt;program_id&gt; - Get program details
/trending - Show trending tokens
/compare &lt;token1,token2&gt; - Compare token metrics
/help - Show this help message

<b>Need more analytics?</b>
Visit AlphaVybe at ${config.ALPHA_VYBE_URL} for in-depth dashboards and data.
`;

		await ctx.reply(helpMessage, {
			parse_mode: "HTML",
		});
	} catch (error) {
		console.error("Error handling help command:", error);
		await ctx.reply(
			"An error occurred while displaying help information. Please try again later.",
		);
	}
};
