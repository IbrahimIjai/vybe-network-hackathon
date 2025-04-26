/**
 * Simple in-memory cache service to store frequently accessed data
 */
export class CacheService {
	private static instance: CacheService;
	private cache: Map<string, any> = new Map();
	private ttls: Map<string, number> = new Map();

	private constructor() {
		// Start cache cleanup process
		setInterval(() => this.cleanup(), 60000); // Run every minute
	}

	public static getInstance(): CacheService {
		if (!CacheService.instance) {
			CacheService.instance = new CacheService();
		}
		return CacheService.instance;
	}

	/**
	 * Set a value in the cache with an optional TTL in milliseconds
	 */
	public set(key: string, value: any, ttlMs?: number): void {
		this.cache.set(key, value);

		if (ttlMs) {
			const expiry = Date.now() + ttlMs;
			this.ttls.set(key, expiry);
		}
	}

	/**
	 * Get a value from the cache
	 */
	public get<T>(key: string): T | null {
		if (!this.has(key)) {
			return null;
		}

		return this.cache.get(key) as T;
	}

	/**
	 * Check if a key exists and is not expired
	 */
	public has(key: string): boolean {
		if (!this.cache.has(key)) {
			return false;
		}

		// Check for expiration
		const expiry = this.ttls.get(key);
		if (expiry && expiry < Date.now()) {
			// Expired, remove it
			this.delete(key);
			return false;
		}

		return true;
	}

	/**
	 * Delete a key from the cache
	 */
	public delete(key: string): void {
		this.cache.delete(key);
		this.ttls.delete(key);
	}

	/**
	 * Clear all expired items from the cache
	 */
	private cleanup(): void {
		const now = Date.now();

		this.ttls.forEach((expiry, key) => {
			if (expiry < now) {
				this.delete(key);
			}
		});
	}
}

// Export a singleton instance
export const cacheService = CacheService.getInstance();
