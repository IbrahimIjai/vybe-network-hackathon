import moment from "moment";

export const FormatUtils = {
	/**
	 * Format currency values
	 */
	formatCurrency(value: number, decimals: number = 2): string {
		if (value === 0) return "$0.00";
		if (!value) return "N/A";

		// For values less than 0.01
		if (value < 0.01 && value > 0) {
			return `$${value.toFixed(6)}`;
		}

		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		}).format(value);
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
	formatTokenAmount(amount: string, decimals: number): string {
		const value = parseInt(amount) / Math.pow(10, decimals);

		// For very small values
		if (value < 0.001 && value > 0) {
			return value.toExponential(4);
		}

		return this.formatNumber(value);
	},

	/**
	 * Format percentage with sign and specified decimals
	 */
	formatPercentage(value: number, decimals: number = 2): string {
		if (value === 0) return "0%";
		if (!value) return "N/A";

		const formattedValue = value.toFixed(decimals);
		return `${value > 0 ? "+" : ""}${formattedValue}%`;
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
	formatDate(timestamp: number, format: string = "MMM DD, YYYY HH:mm"): string {
		return moment(timestamp * 1000).format(format);
	},

	/**
	 * Truncate Solana addresses
	 */
	truncateAddress(address: string): string {
		if (!address) return "";
		if (address.length <= 12) return address;

		return `${address.substring(0, 4)}...${address.substring(
			address.length - 4,
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
};
