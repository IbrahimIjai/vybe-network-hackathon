import { CommandContext } from "grammy";
import { VybeApi } from "../api/vybe";
import { MessageUtils } from "../utils/message";
import { FormatUtils } from "../utils/format";
import { MyContext } from "../types/session";

/**
 * Handle the /token command
 *
 * This command provides detailed information about a token by its symbol or address
 */
export const handleTokenCommand = async (
	ctx: CommandContext<MyContext>,
): Promise<void> => {
	try {
		// Extract token symbol or address from the command
		const input = ctx.match;

		if (!input) {
			await ctx.reply(
				"Please provide a token symbol or mint address. Example: `/token SOL`",
				{
					parse_mode: "Markdown",
				},
			);
			return;
		}

		// Show loading message
		const loadingMessage = await ctx.reply("Fetching token details...");

		try {
			// Try to get token by mint address directly
			let tokenDetails;

			// If input looks like a Solana address (base58 string, typically 32-44 chars)
			if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input)) {
				// Direct fetch by mint address
				tokenDetails = await VybeApi.getTokenDetails(input);
			} else {
				// Fetch tokens list and filter by symbol
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

				tokenDetails = await VybeApi.getTokenDetails(token.mintAddress);
			}

			// Format message with token details
			const message = MessageUtils.formatTokenDetailsMessage(tokenDetails);

			// Get top holders to add to the message
			const holdersData = await VybeApi.getTopHolders(
				tokenDetails.mintAddress,
				3,
			);
			let holdersMessage = "";

			if (holdersData.holders?.length > 0) {
				holdersMessage = "\n\n*Top Holders:*\n";
				holdersData.holders.forEach((holder, index) => {
					const holderName =
						holder.ownerName ||
						FormatUtils.truncateAddress(holder.ownerAddress);
					holdersMessage +=
						`${index + 1}. ${holderName}: ${holder.percentage.toFixed(2)}% ` +
						`(${FormatUtils.formatCurrency(holder.usdValue)})\n`;
				});
			}

			// Update the loading message with the result
			await ctx.api.editMessageText(
				loadingMessage.chat.id,
				loadingMessage.message_id,
				message + holdersMessage,
				{
					parse_mode: "Markdown",
					// disable_web_page_preview: true,
				},
			);

			// Add additional request for price chart in a separate message
			await ctx.reply("Use `/price " + input + "` to see price chart.", {
				parse_mode: "Markdown",
			});
		} catch (error) {
			// Handle specific API errors
			await ctx.api.editMessageText(
				loadingMessage.chat.id,
				loadingMessage.message_id,
				MessageUtils.formatErrorMessage(error),
			);
		}
	} catch (error) {
		// Handle unexpected errors
		await ctx.reply(MessageUtils.formatErrorMessage(error), {
			parse_mode: "Markdown",
		});
	}
};
