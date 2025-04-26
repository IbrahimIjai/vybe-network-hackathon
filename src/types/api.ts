// Token balance response types
export interface TokenBalance {
	mintAddress: string;
	symbol: string;
	name: string;
	amount: string;
	decimals: number;
	usdValue: number;
	solValue?: number;
	logoURI?: string;
}

export interface TokenBalanceResponse {
	ownerAddress: string;
	balances: TokenBalance[];
	totalUsdValue: number;
	totalSolValue?: number;
}

// Price types
export interface PriceData {
	time: number;
	open: number;
	high: number;
	close: number;
	low: number;
	volume: number;
}

export interface TokenPriceResponse {
	mintAddress: string;
	symbol: string;
	name: string;
	data: PriceData[];
}

// Token details types
export interface TokenDetails {
	mintAddress: string;
	name: string;
	symbol: string;
	decimals: number;
	totalSupply: string;
	circulatingSupply: string;
	price: number;
	marketCap: number;
	volume24h: number;
	priceChange24h: number;
	priceChange24hPercentage: number;
	holdersCount: number;
	transfersCount24h: number;
	logoURI?: string;
}

// Top holders types
export interface TokenHolder {
	ownerAddress: string;
	balance: string;
	usdValue: number;
	percentage: number;
	ownerName?: string;
}

export interface TopHoldersResponse {
	mintAddress: string;
	holders: TokenHolder[];
}

// Whale transfer types
export interface TokenTransfer {
	signature: string;
	blockTime: number;
	sender: string;
	receiver: string;
	amount: string;
	usdAmount: number;
	tokenSymbol: string;
	tokenName: string;
	mintAddress: string;
	decimals: number;
	callingProgram: string;
}

// Program types
export interface Program {
	programId: string;
	name: string;
	description?: string;
	dailyActiveUsers: number;
	tvl: number;
	transactionsCount24h: number;
	instructionsCount24h: number;
	labels?: string[];
}

// Account types
export interface KnownAccount {
	ownerAddress: string;
	name: string;
	entityName: string;
	entityId: string;
	labels: string[];
}

// Chart data generic type
export interface ChartData {
	labels: string[];
	datasets: {
		label: string;
		data: number[];
		borderColor?: string;
		backgroundColor?: string | string[];
	}[];
}
