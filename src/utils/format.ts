import moment from "moment";

export const FormatUtils = {
	/**
	 * Format currency values
	 */
	formatCurrency(value: number): string {
		return value === 0
			? "$0.00"
			: value < 0.01
			? "<$0.01"
			: `$${value.toLocaleString(undefined, {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
			  })}`;
	},

	/**
	 * Format large numbers with abbreviations (K, M, B)
	 */
	formatNumber(value: number, decimals: number = 2): string {
		if (value === 0) return "0";
		if (!value) return "N/A";

		const absValue = Math.abs(value);

		if (absValue >= 1_000_000_000) {
			return `${(value / 1_000_000_000).toFixed(decimals)}B`;
		}

		if (absValue >= 1_000_000) {
			return `${(value / 1_000_000).toFixed(decimals)}M`;
		}

		if (absValue >= 1_000) {
			return `${(value / 1_000).toFixed(decimals)}K`;
		}

		return value.toFixed(decimals);
	},

	/**
	 * Format token amounts based on decimals
	 */
	formatTokenAmount(amount: number | string, decimals: number = 0): string {
		const amountNum = typeof amount === "string" ? parseFloat(amount) : amount;
		const divisor = Math.pow(10, decimals);
		const adjustedAmount = amountNum / divisor;

		// Format based on size
		if (adjustedAmount === 0) return "0";
		if (adjustedAmount < 0.000001) return "<0.000001";
		if (adjustedAmount < 1) return adjustedAmount.toFixed(6);
		if (adjustedAmount < 1000) return adjustedAmount.toFixed(4);
		if (adjustedAmount < 1000000)
			return `${(adjustedAmount / 1000).toFixed(2)}K`;
		return `${(adjustedAmount / 1000000).toFixed(2)}M`;
	},

	/**
	 * Format percentage with sign and specified decimals
	 */
	formatPercentage(value: number): string {
		const formattedValue = (value * 100).toFixed(2);
		return `${formattedValue}%`;
	},

	/**
	 * Format timestamp to relative time (e.g., "2 hours ago")
	 */
	formatRelativeTime(timestamp: number): string {
		return moment(timestamp * 1000).fromNow();
	},

	/**
	 * Format timestamp to date string
	 */
	formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleString();
	},

	/**
	 * Truncate Solana addresses
	 */
	truncateAddress(
		address: string,
		startChars: number = 4,
		endChars: number = 4,
	): string {
		if (!address || address.length <= startChars + endChars + 2) {
			return address;
		}
		return `${address.substring(0, startChars)}...${address.substring(
			address.length - endChars,
		)}`;
	},

	/**
	 * Format time period for display (e.g., "24h", "7d")
	 */
	formatTimePeriod(days: number): string {
		if (days === 1) return "24h";
		if (days === 7) return "7d";
		if (days === 30) return "30d";

		return `${days}d`;
	},

	/**
	 * Format error messages for user display
	 */
	formatErrorMessage(error: any): string {
		if (!error) return "An unknown error occurred";

		if (error.response?.data?.message) {
			return error.response.data.message;
		}

		if (error.message) {
			return error.message;
		}

		return "An error occurred. Please try again.";
	},

	/**
	 * Format change with color indicator
	 * This returns a string with + or - prefix
	 */
	formatChange(value: number): string {
		if (value === 0) return "0.00%";
		const prefix = value > 0 ? "+" : "";
		return `${prefix}${(value * 100).toFixed(2)}%`;
	},
};
