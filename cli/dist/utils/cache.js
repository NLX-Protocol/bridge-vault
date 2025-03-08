"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const logger_1 = require("./logger");
// Cache expiration time in milliseconds (default: 5 minutes)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;
class Cache {
    constructor(namespace, ttl = DEFAULT_CACHE_TTL) {
        this.ttl = ttl;
        this.cacheDir = path.join(os.homedir(), '.bridge-vault-cli');
        this.cacheFile = path.join(this.cacheDir, `${namespace}.json`);
        this.cache = {};
        this.initialize();
    }
    initialize() {
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
        }
        catch (error) {
            logger_1.logger.debug(`Failed to initialize cache: ${error}`);
            this.cache = {};
        }
    }
    /**
     * Clean up expired cache entries
     */
    cleanup() {
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
    save() {
        try {
            fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache), 'utf8');
        }
        catch (error) {
            logger_1.logger.debug(`Failed to save cache: ${error}`);
        }
    }
    /**
     * Get a value from the cache
     * @param key Cache key
     * @returns The cached value or undefined if not found or expired
     */
    get(key) {
        const entry = this.cache[key];
        const now = Date.now();
        if (entry && entry.expiresAt > now) {
            logger_1.logger.debug(`Cache hit for key: ${key}`);
            return entry.value;
        }
        logger_1.logger.debug(`Cache miss for key: ${key}`);
        return undefined;
    }
    /**
     * Set a value in the cache
     * @param key Cache key
     * @param value Value to cache
     * @param ttl Custom TTL for this entry (overrides the default)
     */
    set(key, value, ttl = this.ttl) {
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
    remove(key) {
        if (this.cache[key]) {
            delete this.cache[key];
            this.save();
        }
    }
    /**
     * Clear all cached values
     */
    clear() {
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
    async getOrCompute(key, compute, ttl = this.ttl) {
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const value = await compute();
        this.set(key, value, ttl);
        return value;
    }
}
exports.Cache = Cache;
