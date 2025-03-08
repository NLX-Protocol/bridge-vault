export declare class Cache {
    private cacheDir;
    private cacheFile;
    private cache;
    private ttl;
    constructor(namespace: string, ttl?: number);
    private initialize;
    /**
     * Clean up expired cache entries
     */
    private cleanup;
    /**
     * Save cache to file
     */
    private save;
    /**
     * Get a value from the cache
     * @param key Cache key
     * @returns The cached value or undefined if not found or expired
     */
    get<T>(key: string): T | undefined;
    /**
     * Set a value in the cache
     * @param key Cache key
     * @param value Value to cache
     * @param ttl Custom TTL for this entry (overrides the default)
     */
    set<T>(key: string, value: T, ttl?: number): void;
    /**
     * Remove a value from the cache
     * @param key Cache key
     */
    remove(key: string): void;
    /**
     * Clear all cached values
     */
    clear(): void;
    /**
     * Get a value from cache or compute it if not found/expired
     * @param key Cache key
     * @param compute Function to compute the value if not in cache
     * @param ttl Custom TTL for this entry
     * @returns The cached or computed value
     */
    getOrCompute<T>(key: string, compute: () => Promise<T>, ttl?: number): Promise<T>;
}
