import { FormatUtils } from "./format";
import config from "../config";
import {
	TokenDetails,
	TokenBalance,
	TokenTransfer,
	Program,
} from "../types/api";

export const MessageUtils = {
	/**
	 * Create a URL to AlphaVybe platform with a specific path
	 */
	createAlphaVybeUrl(path: string): string {
		return `${config.VYBE_API_BASE_URL}${path}`;
	},

	/**
	 * Format token details message
	 */
	formatTokenDetailsMessage(token: TokenDetails): string {
		const priceChangeText =
			token.priceChange24hPercentage > 0
				? `+${token.priceChange24hPercentage.toFixed(2)}% ↗️`
				: `${token.priceChange24hPercentage.toFixed(2)}% ↘️`;

		return (
			`*${token.name} (${token.symbol})*\n\n` +
			`💰 *Price:* ${FormatUtils.formatCurrency(token.price)}\n` +
			`📈 *24h Change:* ${priceChangeText}\n` +
			`📊 *Market Cap:* ${FormatUtils.formatCurrency(token.marketCap)}\n` +
			`💧 *24h Volume:* ${FormatUtils.formatCurrency(token.volume24h)}\n` +
			`👥 *Holders:* ${FormatUtils.formatNumber(token.holdersCount, 0)}\n` +
			`🔄 *24h Transfers:* ${FormatUtils.formatNumber(
				token.transfersCount24h,
				0,
			)}\n\n` +
			`[View on AlphaVybe](${this.createAlphaVybeUrl(
				`/token/${token.mintAddress}`,
			)})`
		);
	},

	/**
	 * Format token balance message
	 */
	formatTokenBalancesMessage(
		tokenBalances: TokenBalance[],
		totalValue: number,
	): string {
		// Sort by USD value (descending)
		const sortedBalances = [...tokenBalances].sort(
			(a, b) => b.usdValue - a.usdValue,
		);

		// Take top 10 tokens by value
		const topBalances = sortedBalances.slice(0, 10);

		let message =
			`*Wallet Token Holdings*\n` +
			`💼 *Total Value:* ${FormatUtils.formatCurrency(totalValue)}\n\n`;

		topBalances.forEach((token, index) => {
			message +=
				`${index + 1}. *${token.symbol}*: ${FormatUtils.formatTokenAmount(
					token.amount,
					token.decimals,
				)} ` + `(${FormatUtils.formatCurrency(token.usdValue)})\n`;
		});

		if (tokenBalances.length > 10) {
			const remainingValue = sortedBalances
				.slice(10)
				.reduce((sum, token) => sum + token.usdValue, 0);
			message += `\n*+${
				tokenBalances.length - 10
			} more tokens* (${FormatUtils.formatCurrency(remainingValue)})`;
		}

		return message;
	},

	/**
	 * Format whale transfer message
	 */
	formatWhaleTransferMessage(transfer: TokenTransfer): string {
		const amount = FormatUtils.formatTokenAmount(
			transfer.amount,
			transfer.decimals,
		);

		return (
			`🐋 *Whale Transfer Detected*\n\n` +
			`*${transfer.tokenName} (${transfer.tokenSymbol})*\n` +
			`💰 *Amount:* ${amount} (${FormatUtils.formatCurrency(
				transfer.usdAmount,
			)})\n` +
			`🔄 *From:* \`${FormatUtils.truncateAddress(transfer.sender)}\`\n` +
			`🔄 *To:* \`${FormatUtils.truncateAddress(transfer.receiver)}\`\n` +
			`⏱ *When:* ${FormatUtils.formatRelativeTime(transfer.blockTime)}\n\n` +
			`[View on AlphaVybe](${this.createAlphaVybeUrl(
				`/tx/${transfer.signature}`,
			)})`
		);
	},

	/**
	 * Format program details message
	 */
	formatProgramDetailsMessage(program: Program): string {
		return (
			`*${program.name}* Program\n\n` +
			`📝 *Program ID:* \`${FormatUtils.truncateAddress(
				program.programId,
			)}\`\n` +
			`💰 *TVL:* ${FormatUtils.formatCurrency(program.tvl)}\n` +
			`👥 *Daily Active Users:* ${FormatUtils.formatNumber(
				program.dailyActiveUsers,
				0,
			)}\n` +
			`🔄 *24h Transactions:* ${FormatUtils.formatNumber(
				program.transactionsCount24h,
				0,
			)}\n` +
			`📋 *24h Instructions:* ${FormatUtils.formatNumber(
				program.instructionsCount24h,
				0,
			)}\n` +
			`🏷️ *Labels:* ${program.labels?.join(", ") || "N/A"}\n\n` +
			`[View on AlphaVybe](${this.createAlphaVybeUrl(
				`/program/${program.programId}`,
			)})`
		);
	},

	/**
	 * Format price chart message
	 */
	formatPriceChartMessage(token: TokenDetails, days: number): string {
		return (
			`*${token.name} (${
				token.symbol
			})* Price - Last ${FormatUtils.formatTimePeriod(days)}\n\n` +
			`💰 *Current Price:* ${FormatUtils.formatCurrency(token.price)}\n` +
			`📈 *24h Change:* ${FormatUtils.formatPercentage(
				token.priceChange24hPercentage,
			)}\n\n` +
			`[View on AlphaVybe](${this.createAlphaVybeUrl(
				`/token/${token.mintAddress}`,
			)})`
		);
	},

	/**
	 * Format error message
	 */
	formatErrorMessage(error: any): string {
		return `❌ *Error:* ${FormatUtils.formatErrorMessage(error)}`;
	},

	/**
	 * Format help message
	 */
	formatHelpMessage(): string {
		return (
			`*🤖 Vybe Analytics Bot*\n\n` +
			`Get real-time on-chain analytics for Solana tokens, accounts, and programs.\n\n` +
			`*Available Commands:*\n\n` +
			`/token <symbol/address> - Get detailed token information\n` +
			`/price <symbol/address> - Get token price chart\n` +
			`/wallet <address> - Get wallet token holdings\n` +
			`/holders <symbol/address> - Get top token holders\n` +
			`/whales <symbol/address> - Track large token transfers\n` +
			`/program <program_id> - Get program details\n` +
			`/trending - Show trending tokens\n` +
			`/compare <token1,token2> - Compare token metrics\n` +
			`/help - Show this help message\n\n` +
			`*Need more analytics?*\n` +
			`[Visit AlphaVybe](${config.VYBE_API_BASE_URL}) for in-depth dashboards and data.`
		);
	},
};
