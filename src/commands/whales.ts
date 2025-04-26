import { CommandContext, Context } from "grammy";
import { VybeApi } from "../api/vybe";
import { MessageUtils } from "../utils/message";
import { FormatUtils } from "../utils/format";
import { TokenTransfer } from "../types/api";

// This command shows recent large transfers (whale movements) for a given token

export const handleWhalesCommand = async (
	ctx: CommandContext<Context>,
): Promise<void> => {
	try {
		// Parse command input
		const input = ctx.match;

		if (!input) {
			await ctx.reply(
				"Please provide a token symbol or mint address. Example: `/whales SOL`",
				{
					parse_mode: "Markdown",
				},
			);
			return;
		}

		// Show loading message
		const loadingMessage = await ctx.reply("Fetching whale transactions...");

		try {
			let mintAddress: string;
			let tokenSymbol: string;

			if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input)) {
				mintAddress = input;
				const tokenDetails = await VybeApi.getTokenDetails(mintAddress);
				tokenSymbol = tokenDetails.symbol;
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
			}

			// Set minimum USD value for whale transfers (adjust based on token's typical value)
			const tokenDetails = await VybeApi.getTokenDetails(mintAddress);

			// Calculate minimum whale transfer value based on token price and market cap
			// This ensures the threshold makes sense for the specific token
			let minUsdAmount = 10000; // Default minimum of $10k

			if (tokenDetails.marketCap) {
				// For high market cap tokens, use higher threshold
				if (tokenDetails.marketCap > 1_000_000_000) {
					// $1B+
					minUsdAmount = 100000; // $100k
				} else if (tokenDetails.marketCap > 100_000_000) {
					// $100M+
					minUsdAmount = 50000; // $50k
				} else if (tokenDetails.marketCap < 10_000_000) {
					// <$10M
					minUsdAmount = 5000; // $5k
				}
			}

			// Get whale transfers
			const transfers = await VybeApi.getTokenTransfers({
				mintAddress,
				minUsdAmount,
				sortByDesc: "blockTime",
				limit: 10,
			});

			if (!transfers || transfers.length === 0) {
				await ctx.api.editMessageText(
					loadingMessage.chat.id,
					loadingMessage.message_id,
					`No significant transfers found for ${tokenSymbol} in the recent period.`,
				);
				return;
			}

			// Prepare message header
			let message =
				`*🐋 Recent Whale Transfers for ${tokenSymbol}*\n` +
				`Showing transfers over ${FormatUtils.formatCurrency(
					minUsdAmount,
				)}\n\n`;

			// Send first message with header and first transfer
			const firstTransfer = transfers[0];
			const firstTransferMessage =
				MessageUtils.formatWhaleTransferMessage(firstTransfer);

			await ctx.api.editMessageText(
				loadingMessage.chat.id,
				loadingMessage.message_id,
				message + firstTransferMessage,
				{
					parse_mode: "Markdown",
					// disable_web_page_preview: true,
				},
			);

			// Send remaining transfers as separate messages to avoid hitting message length limits
			for (let i = 1; i < Math.min(transfers.length, 5); i++) {
				const transferMessage = MessageUtils.formatWhaleTransferMessage(
					transfers[i],
				);

				await ctx.reply(transferMessage, {
					parse_mode: "Markdown",
					// disable_web_page_preview: true,
				});

				// Add a slight delay to avoid hitting rate limits
				if (i < Math.min(transfers.length, 5) - 1) {
					await new Promise((resolve) => setTimeout(resolve, 500));
				}
			}

			// If there are more transfers, mention that
			if (transfers.length > 5) {
				await ctx.reply(
					`*${transfers.length - 5} more transfers found.*\n` +
						`Use \`/token ${tokenSymbol}\` for more details about this token.`,
					{ parse_mode: "Markdown" },
				);
			}

			// Add analytics summary
			const totalValue = transfers.reduce((sum, t) => sum + t.usdAmount, 0);
			const avgValue = totalValue / transfers.length;

			await ctx.reply(
				`*📊 Whale Analytics for ${tokenSymbol}*\n\n` +
					`Total transferred: ${FormatUtils.formatCurrency(totalValue)}\n` +
					`Average transfer: ${FormatUtils.formatCurrency(avgValue)}\n` +
					`Number of transfers: ${transfers.length}\n\n` +
					`[View more on AlphaVybe](${MessageUtils.createAlphaVybeUrl(
						`/token/${mintAddress}`,
					)})`,
				{
					parse_mode: "Markdown",
				},
			);
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
