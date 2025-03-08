import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from './logger';

interface CacheData {
  [key: string]: {
    value: any;
    expiresAt: number;
  };
}

// Cache expiration time in milliseconds (default: 5 minutes)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

export class Cache {
  private cacheDir: string;
  private cacheFile: string;
  private cache: CacheData;
  private ttl: number;

  constructor(namespace: string, ttl: number = DEFAULT_CACHE_TTL) {
    this.ttl = ttl;
    this.cacheDir = path.join(os.homedir(), '.bridge-vault-cli');
    this.cacheFile = path.join(this.cacheDir, `${namespace}.json`);
    this.cache = {};
    this.initialize();
  }

  private initialize(): void {
    try {
      // Create cache directory if it doesn't exist
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }

      // Load cache from file if it exists
      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, 'utf8');
        this.cache = JSON.parse(data);
        
        // Clean up expired cache entries
        this.cleanup();
      }
    } catch (error) {
      logger.debug(`Failed to initialize cache: ${error}`);
      this.cache = {};
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = false;

    for (const key of Object.keys(this.cache)) {
      if (this.cache[key].expiresAt < now) {
        delete this.cache[key];
        cleaned = true;
      }
    }

    if (cleaned) {
      this.save();
    }
  }

  /**
   * Save cache to file
   */
  private save(): void {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache), 'utf8');
    } catch (error) {
      logger.debug(`Failed to save cache: ${error}`);
    }
  }

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns The cached value or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache[key];
    const now = Date.now();

    if (entry && entry.expiresAt > now) {
      logger.debug(`Cache hit for key: ${key}`);
      return entry.value as T;
    }

    logger.debug(`Cache miss for key: ${key}`);
    return undefined;
  }

  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Custom TTL for this entry (overrides the default)
   */
  set<T>(key: string, value: T, ttl: number = this.ttl): void {
    this.cache[key] = {
      value,
      expiresAt: Date.now() + ttl
    };
    this.save();
  }

  /**
   * Remove a value from the cache
   * @param key Cache key
   */
  remove(key: string): void {
    if (this.cache[key]) {
      delete this.cache[key];
      this.save();
    }
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache = {};
    this.save();
  }

  /**
   * Get a value from cache or compute it if not found/expired
   * @param key Cache key
   * @param compute Function to compute the value if not in cache
   * @param ttl Custom TTL for this entry
   * @returns The cached or computed value
   */
  async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttl: number = this.ttl
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await compute();
    this.set(key, value, ttl);
    return value;
  }
}