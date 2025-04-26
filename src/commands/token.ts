import { CommandContext, InlineKeyboard } from "grammy";
import { VybeApi } from "../api/vybe";
import { MessageUtils } from "../utils/message";
import { FormatUtils } from "../utils/format";
import { MyContext } from "../types/session";

/**
 * Handle token command
 * Shows token details if an address is provided, otherwise shows top tokens by market cap
 */
export const handleTokenCommand = async (
	ctx: CommandContext<MyContext>,
): Promise<void> => {
	try {
		// Get the command arguments
		const args = ctx.match.trim();

		// If no arguments, show top tokens
		if (!args) {
			await displayTopTokens(ctx);
			return;
		}

		// Otherwise, try to show token details
		await displayTokenDetails(ctx, args);
	} catch (error) {
		console.error("Error handling token command:", error);
		await ctx.reply(
			"An error occurred while fetching token information. Please try again.",
		);
	}
};

/**
 * Display top tokens by market cap
 */
const displayTopTokens = async (ctx: MyContext): Promise<void> => {
	// Show loading message
	const loadingMsg = await ctx.reply("Loading top tokens by market cap...");

	try {
		// Fetch top tokens
		const tokens = await VybeApi.getTopTokensByMarketCap(10);
		console.log({ tokensLengthh: tokens.length });

		if (!tokens || tokens.length === 0) {
			await ctx.api.editMessageText(
				loadingMsg.chat.id,
				loadingMsg.message_id,
				"No token data available at the moment.",
			);
			return;
		}

		// Create message
		let message = "*Top Tokens by Market Cap*\n\n";
		message += "```\n";
		message += "Token      | Price            | 24h Change\n";
		message += "-----------|-----------------|-----------\n";

		// Add token rows
		tokens.forEach((token, index) => {
			const symbol = (token.symbol || "Unknown").padEnd(10, " ");
			const price = FormatUtils.formatCurrency(
				parseFloat(token.price || 0),
			).padEnd(15, " ");

			const priceChange1d = parseFloat(token.priceChange1d || 0);
			const changeSign = priceChange1d >= 0 ? "+" : "";
			const change = `${changeSign}${(priceChange1d * 100).toFixed(2)}%`;

			message += `${symbol} | ${price} | ${change}\n`;
		});

		message += "```\n\n";
		message += "Click on a token to see detailed information:\n";

		// Create keyboard with tokens
		const keyboard = new InlineKeyboard();

		// Add tokens to keyboard (two columns)
		for (let i = 0; i < tokens.length; i += 2) {
			const token1 = tokens[i];
			const token2 = i + 1 < tokens.length ? tokens[i + 1] : null;

			keyboard.text(`${token1.symbol}`, `token_details:${token1.mintAddress}`);

			if (token2) {
				keyboard.text(
					`${token2.symbol}`,
					`token_details:${token2.mintAddress}`,
				);
			}

			keyboard.row();
		}

		// Update message
		await ctx.api.editMessageText(
			loadingMsg.chat.id,
			loadingMsg.message_id,
			message,
			{
				parse_mode: "Markdown",
				reply_markup: keyboard,
			},
		);
	} catch (error) {
		console.error("Error displaying top tokens:", error);

		// Update loading message with error
		await ctx.api.editMessageText(
			loadingMsg.chat.id,
			loadingMsg.message_id,
			"An error occurred while fetching top tokens. Please try again.",
		);
	}
};

/**
 * Display token details for a specific token
 */
export const displayTokenDetails = async (
	ctx: MyContext,
	mintAddress: string,
): Promise<void> => {
	// Show loading message
	const loadingMsg = await ctx.reply(`Loading token details...`);

	try {
		// Fetch token details
		const tokenDetails = await VybeApi.getDetailedTokenInfo(mintAddress);

		if (!tokenDetails) {
			await ctx.api.editMessageText(
				loadingMsg.chat.id,
				loadingMsg.message_id,
				`No details found for the specified token.`,
				{
					reply_markup: createBackToTokensKeyboard(),
				},
			);
			return;
		}

		// Create message with token information
		let message = `*${tokenDetails.name} (${tokenDetails.symbol})*\n\n`;

		// Token basic information
		message += `*Contract:* \`${mintAddress}\`\n`;
		message += `*Current Price:* ${FormatUtils.formatCurrency(
			parseFloat(tokenDetails.price || 0),
		)}\n`;

		// Add market data
		if (tokenDetails.marketCap) {
			message += `*Market Cap:* ${FormatUtils.formatCurrency(
				parseFloat(tokenDetails.marketCap),
			)}\n`;
		}

		if (tokenDetails.fullyDilutedValuation) {
			message += `*Fully Diluted Valuation:* ${FormatUtils.formatCurrency(
				parseFloat(tokenDetails.fullyDilutedValuation),
			)}\n`;
		}

		if (tokenDetails.volume1d) {
			message += `*24h Volume:* ${FormatUtils.formatCurrency(
				parseFloat(tokenDetails.volume1d),
			)}\n`;
		}

		// Add price change information
		const priceChange1d = parseFloat(tokenDetails.priceChange1d || 0);
		const changeSign = priceChange1d >= 0 ? "+" : "";
		message += `*24h Change:* ${changeSign}${(priceChange1d * 100).toFixed(
			2,
		)}%\n`;

		// Add 7d price change if available
		if (tokenDetails.priceChange7d) {
			const priceChange7d = parseFloat(tokenDetails.priceChange7d);
			const changeSign7d = priceChange7d >= 0 ? "+" : "";
			message += `*7d Change:* ${changeSign7d}${(priceChange7d * 100).toFixed(
				2,
			)}%\n`;
		}

		// Add trading details and liquidity if available
		if (tokenDetails.liquidity) {
			message += `*Liquidity:* ${FormatUtils.formatCurrency(
				parseFloat(tokenDetails.liquidity),
			)}\n`;
		}

		// Add token supply information
		if (tokenDetails.supply) {
			message += `*Supply:* ${parseInt(
				tokenDetails.supply,
			).toLocaleString()}\n`;
		}

		if (tokenDetails.circulatingSupply) {
			message += `*Circulating Supply:* ${parseInt(
				tokenDetails.circulatingSupply,
			).toLocaleString()}\n`;
		}

		// Add social links
		message += "\n*Links:*\n";

		if (tokenDetails.website) {
			message += `[Website](${tokenDetails.website}) `;
		}

		if (tokenDetails.twitter) {
			message += `[Twitter](${tokenDetails.twitter}) `;
		}

		if (tokenDetails.telegram) {
			message += `[Telegram](${tokenDetails.telegram})`;
		}

		// Add explorer link
		message += `\n\n[View on Explorer](https://solscan.io/token/${mintAddress})\n`;

		// Create keyboard with copy button
		const keyboard = new InlineKeyboard()
			.text("📋 Copy Address", `copy_token:${mintAddress}`)
			.text("📈 See Price Chart", `price_chart:${mintAddress}`)
			.row()
			.text("« Back to Top Tokens", "back_to_tokens");

		// Update loading message with token details
		await ctx.api.editMessageText(
			loadingMsg.chat.id,
			loadingMsg.message_id,
			message,
			{
				parse_mode: "Markdown",
				reply_markup: keyboard,
			},
		);
	} catch (error) {
		console.error("Error displaying token details:", error);

		// Update loading message with error
		await ctx.api.editMessageText(
			loadingMsg.chat.id,
			loadingMsg.message_id,
			"An error occurred while fetching token details. Please try again.",
			{
				reply_markup: createBackToTokensKeyboard(),
			},
		);
	}
};

/**
 * Create a back to tokens keyboard
 */
const createBackToTokensKeyboard = (): InlineKeyboard => {
	return new InlineKeyboard().text("« Back to Top Tokens", "back_to_tokens");
};
