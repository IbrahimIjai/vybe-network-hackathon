// Note: Install required packages: npm install @upstash/redis
import { Redis } from "@upstash/redis";
import config from "../config";

// Define interfaces
export interface UserWallet {
	address: string;
	label?: string;
	addedAt: number;
}

export interface UserData {
	userId: number;
	username?: string;
	wallets: UserWallet[];
	lastInteraction: number;
}

class RedisService {
	private client: Redis;

	constructor() {
		this.client = new Redis({
			url: config.REDIS_URL,
			token: config.REDIS_TOKEN || "", // Default to empty string if token is not defined
		});
	}

	async connect(): Promise<void> {
		console.log("Upstash Redis service initialized");
	}

	async getUserData(userId: number): Promise<UserData | null> {
		const userData = await this.client.get(`user:${userId}`);
		return userData as UserData | null;
	}

	async saveUserData(userData: UserData): Promise<void> {
		await this.client.set(`user:${userData.userId}`, userData);
	}

	async addUserWallet(userId: number, wallet: UserWallet): Promise<void> {
		const userData = await this.getUserData(userId);

		if (userData) {
			// Check if wallet already exists
			if (!userData.wallets.some((w) => w.address === wallet.address)) {
				userData.wallets.push(wallet);
				userData.lastInteraction = Date.now();
				await this.saveUserData(userData);
			}
		} else {
			// Create new user data
			const newUserData: UserData = {
				userId,
				wallets: [wallet],
				lastInteraction: Date.now(),
			};
			await this.saveUserData(newUserData);
		}
	}

	async removeUserWallet(
		userId: number,
		walletAddress: string,
	): Promise<boolean> {
		const userData = await this.getUserData(userId);

		if (userData) {
			const initialLength = userData.wallets.length;
			userData.wallets = userData.wallets.filter(
				(w) => w.address !== walletAddress,
			);
			userData.lastInteraction = Date.now();

			await this.saveUserData(userData);
			return userData.wallets.length < initialLength;
		}

		return false;
	}

	async registerUser(userId: number, username?: string): Promise<void> {
		const existingUser = await this.getUserData(userId);

		if (!existingUser) {
			const userData: UserData = {
				userId,
				username,
				wallets: [],
				lastInteraction: Date.now(),
			};
			await this.saveUserData(userData);
		} else {
			// Update username if provided
			if (username && existingUser.username !== username) {
				existingUser.username = username;
				existingUser.lastInteraction = Date.now();
				await this.saveUserData(existingUser);
			}
		}
	}

	// Set-based wallet management methods
	async addWallet(userId: string, walletAddress: string): Promise<boolean> {
		try {
			const userWalletsKey = `user:${userId}:wallets`;
			const walletUsersKey = `wallet:${walletAddress}:users`;

			// Add user to wallet's subscribers
			await this.client.sadd(walletUsersKey, userId);

			return true;
		} catch (error) {
			console.error("Error adding wallet:", error);
			return false;
		}
	}

	async removeWallet(userId: string, walletAddress: string): Promise<boolean> {
		try {
			const userWalletsKey = `user:${userId}:wallets`;
			const walletUsersKey = `wallet:${walletAddress}:users`;

			// Remove wallet from user's wallets
			await this.client.srem(userWalletsKey, walletAddress);

			// Remove user from wallet's subscribers
			await this.client.srem(walletUsersKey, userId);

			return true;
		} catch (error) {
			console.error("Error removing wallet:", error);
			return false;
		}
	}

	async getUserWallets(userId: string): Promise<string[]> {
		try {
			const userWalletsKey = `user:${userId}:wallets`;
			return await this.client.smembers(userWalletsKey);
		} catch (error) {
			console.error("Error getting user wallets:", error);
			return [];
		}
	}

	async getWalletSubscribers(walletAddress: string): Promise<string[]> {
		try {
			const walletUsersKey = `wallet:${walletAddress}:users`;
			return await this.client.smembers(walletUsersKey);
		} catch (error) {
			console.error("Error getting wallet subscribers:", error);
			return [];
		}
	}
}

// Export singleton instance
export const redisService = new RedisService();
