import axios from "axios";
import config from "../config";
import {
	TokenBalanceResponse,
	TokenDetails,
	TopHoldersResponse,
	TokenTransfer,
	PriceData,
	Program,
	KnownAccount,
} from "../types/api";

// Create axios instance
const api = axios.create({
	baseURL: config.VYBE_API_BASE_URL,
	headers: {
		"x-api-key": config.VYBE_API_KEY,
		"Content-Type": "application/json",
	},
});

export const VybeApi = {
	// async getTokenBalance(ownerAddress: string): Promise<TokenBalanceResponse> {
	// 	const response = await api.get(`/account/token-balance/${ownerAddress}`);
	// 	return response.data;
	// },

	async getNFTBalance(ownerAddress: string): Promise<any> {
		const response = await api.get(`/account/nft-balance/${ownerAddress}`);
		return response.data;
	},

	async getMultiWalletTokenBalances(wallets: string[]): Promise<any> {
		const response = await api.post("/account/token-balances", { wallets });

		console.log({ response });
		return response.data;
	},

	async getTokenDetails(mintAddress: string): Promise<TokenDetails> {
		const response = await api.get(`/token/${mintAddress}`);
		return response.data;
	},

	async getTopHolders(
		mintAddress: string,
		limit: number = 20,
	): Promise<TopHoldersResponse> {
		const response = await api.get(`/token/${mintAddress}/top-holders`, {
			params: { limit, sortByDesc: "valueUsd" },
		});

		console.log({ holdersssresponsesssss: response });
		return response.data.data;
	},

	async getTokenTransfers(params: any = {}): Promise<TokenTransfer[]> {
		const response = await api.get("/token/transfers", { params });
		return response.data.transfers;
	},

	async getTokenHoldersTimeSeries(
		mintId: string,
		interval: string = "1d",
	): Promise<any> {
		const response = await api.get(`/token/${mintId}/holders-ts`, {
			params: { interval },
		});
		return response.data;
	},

	async getTokenTransferVolume(
		mintId: string,
		interval: string = "1d",
	): Promise<any> {
		const response = await api.get(`/token/${mintId}/transfer-volume`, {
			params: { interval },
		});
		return response.data;
	},

	async getTokensList(params: any = {}): Promise<any> {
		const response = await api.get("/tokens", { params });
		return response.data;
	},

	// Price endpoints
	async getTokenPrice(
		mintAddress: string,
		resolution: string = "1d",
		limit: number = 7,
	): Promise<PriceData[]> {
		const response = await api.get(`/price/${mintAddress}/token-ohlcv`, {
			params: { resolution, limit },
		});
		return response.data.data;
	},

	async getPairPrice(
		baseMintAddress: string,
		quoteMintAddress: string,
		resolution: string = "1d",
	): Promise<any> {
		const response = await api.get(
			`/price/${baseMintAddress}+${quoteMintAddress}/pair-ohlcv`,
			{
				params: { resolution },
			},
		);
		return response.data;
	},

	async getPythPrice(priceFeedId: string): Promise<any> {
		const response = await api.get(`/price/${priceFeedId}/pyth-price`);
		return response.data;
	},

	async getProgramDetails(programId: string): Promise<Program> {
		const response = await api.get(`/program/${programId}`);
		return response.data;
	},

	async getProgramActiveUsers(
		programId: string,
		days: number = 7,
	): Promise<any> {
		const response = await api.get(`/program/${programId}/active-users`, {
			params: { days },
		});
		return response.data;
	},

	async getProgramTVL(
		programId: string,
		resolution: string = "1d",
	): Promise<any> {
		const response = await api.get(`/program/${programId}/tvl`, {
			params: { resolution },
		});
		return response.data;
	},

	async getProgramActiveUsersTimeSeries(
		programId: string,
		range: string = "7d",
	): Promise<any> {
		const response = await api.get(`/program/${programId}/active-users-ts`, {
			params: { range },
		});
		return response.data;
	},

	async getProgramsList(params: any = {}): Promise<Program[]> {
		const response = await api.get("/programs", { params });
		return response.data.programs;
	},

	/**
	 * Check if a token exists by symbol
	 */
	async checkTokenExists(symbol: string): Promise<boolean> {
		try {
			const tokens = await this.getTokensList();
			return tokens.some(
				(t: any) =>
					t.symbol?.toLowerCase() === symbol.toLowerCase() ||
					t.name?.toLowerCase() === symbol.toLowerCase(),
			);
		} catch (error) {
			console.error("Error checking token existence:", error);
			return false;
		}
	},

	/**
	 * Get a token by symbol
	 */
	async getTokenBySymbol(symbol: string): Promise<any> {
		try {
			const tokens = await this.getTokensList();
			return tokens.find(
				(t: any) =>
					t.symbol?.toLowerCase() === symbol.toLowerCase() ||
					t.name?.toLowerCase() === symbol.toLowerCase(),
			);
		} catch (error) {
			console.error("Error getting token by symbol:", error);
			return null;
		}
	},

	/**
	 * Get wallet transfers
	 */
	async getWalletTransfers(
		walletAddress: string,
		fromTimestamp: number,
	): Promise<any[]> {
		try {
			const response = await api.get(`/transfers`, {
				params: { address: walletAddress, fromTime: fromTimestamp },
			});
			return response.data.transfers || [];
		} catch (error) {
			console.error("Error fetching wallet transfers:", error);
			return [];
		}
	},

	/**
	 * Get NFT balances for multiple wallet addresses
	 */
	async getNFTBalances(walletAddresses: string[]): Promise<any> {
		try {
			const response = await api.post("/account/nft-balances", {
				wallets: walletAddresses,
			});
			return response.data;
		} catch (error) {
			console.error("Error fetching NFT balances:", error);
			return {
				totalValueUsd: 0,
				nfts: [],
			};
		}
	},

	/**
	 * Get top tokens by market cap
	 */
	async getTopTokensByMarketCap(limit: number = 10): Promise<any[]> {
		try {
			const response = await api.get("/tokens", {
				params: {
					sortByDesc: "market_cap",
					limit,
					page: 0,
				},
			});

			return response.data.data || [];
		} catch (error) {
			console.error("Error fetching top tokens:", error);
			return [];
		}
	},

	/**
	 * Get detailed token information by mint address
	 */
	async getDetailedTokenInfo(mintAddress: string): Promise<any> {
		try {
			const response = await api.get(`/token/${mintAddress}`);
			console.log({ resssssssssssss: response.data.data });

			return response.data;
		} catch (error) {
			console.error(`Error fetching token details for ${mintAddress}:`, error);
			return null;
		}
	},

	/**
	 * Get token OHLCV data for price charts
	 */
	async getTokenOHLCV(
		mintAddress: string,
		resolution: string = "1d",
		limit: number = 30,
	): Promise<any> {
		try {
			const response = await api.get(`/price/${mintAddress}/token-ohlcv`, {
				params: {
					resolution,
					limit,
				},
			});
			return response.data.data || [];
		} catch (error) {
			console.error(`Error fetching OHLCV data for ${mintAddress}:`, error);
			return [];
		}
	},
};
