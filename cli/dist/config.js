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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.getNetwork = getNetwork;
exports.getAvailableNetworks = getAvailableNetworks;
exports.getContractSet = getContractSet;
exports.setContractSet = setContractSet;
exports.getTokenWhitelist = getTokenWhitelist;
exports.setTokenWhitelist = setTokenWhitelist;
exports.addNetwork = addNetwork;
exports.removeNetwork = removeNetwork;
exports.getPrivateKey = getPrivateKey;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("./utils/logger");
const validation_1 = require("./utils/validation");
const cache_1 = require("./utils/cache");
// Load environment variables
dotenv_1.default.config();
// Initialize cache for config
const configCache = new cache_1.Cache('config', 30 * 1000); // 30 seconds cache
const DEFAULT_CONFIG = {
    networks: {
        arbitrum: {
            rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
            chainId: 42161,
            name: 'Arbitrum One',
            contracts: undefined,
            tokenWhitelist: {}
        },
        localhost: {
            rpcUrl: 'http://127.0.0.1:8545',
            chainId: 31337,
            name: 'Localhost',
            contracts: undefined,
            tokenWhitelist: {}
        }
    }
};
// Config file paths
const CONFIG_PATHS = [
    path.join(process.cwd(), 'vault-config.json'),
    path.join(os.homedir(), '.bridge-vault-cli/config.json')
];
/**
 * Attempt to load config from multiple locations
 */
function loadConfig() {
    // Try to get from cache first
    const cachedConfig = configCache.get('config');
    if (cachedConfig) {
        return cachedConfig;
    }
    // Try to load from file
    for (const configPath of CONFIG_PATHS) {
        try {
            if (fs.existsSync(configPath)) {
                const fileContent = fs.readFileSync(configPath, 'utf8');
                const config = JSON.parse(fileContent);
                // Deep merge with default config
                const mergedConfig = deepMerge(DEFAULT_CONFIG, config);
                // Validate the merged config
                const errors = (0, validation_1.validateConfig)(mergedConfig);
                if (errors.length > 0) {
                    logger_1.logger.warn(`Config validation warnings for ${configPath}:`);
                    errors.forEach(error => logger_1.logger.warn(`- ${error}`));
                }
                // Cache the config
                configCache.set('config', mergedConfig);
                return mergedConfig;
            }
        }
        catch (error) {
            logger_1.logger.error(`Error loading config from ${configPath}: ${error.message}`);
        }
    }
    // If no config found, create default config
    logger_1.logger.warn('No config file found. Using default configuration.');
    createDefaultConfig();
    // Cache the default config
    configCache.set('config', DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
}
/**
 * Create a default config file if none exists
 */
function createDefaultConfig() {
    try {
        const configDir = path.dirname(CONFIG_PATHS[0]);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG_PATHS[0], JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
        logger_1.logger.info(`Created default config at ${CONFIG_PATHS[0]}`);
    }
    catch (error) {
        logger_1.logger.error(`Failed to create default config: ${error.message}`);
    }
}
/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
            result[key] = deepMerge(target[key], source[key]);
        }
        else {
            result[key] = source[key];
        }
    }
    return result;
}
/**
 * Save config to file
 */
function saveConfig(config) {
    try {
        // Validate config before saving
        const errors = (0, validation_1.validateConfig)(config);
        if (errors.length > 0) {
            logger_1.logger.warn('Config validation warnings:');
            errors.forEach(error => logger_1.logger.warn(`- ${error}`));
        }
        const configPath = CONFIG_PATHS[0];
        const configDir = path.dirname(configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        // Update cache
        configCache.set('config', config);
        logger_1.logger.debug(`Config saved to ${configPath}`);
    }
    catch (error) {
        logger_1.logger.error(`Error saving config: ${error.message}`);
        throw new Error(`Failed to save configuration: ${error.message}`);
    }
}
/**
 * Get network configuration
 */
function getNetwork(networkName) {
    (0, validation_1.validateNetworkName)(networkName);
    const config = loadConfig();
    const network = config.networks[networkName];
    if (!network) {
        throw new Error(`Network '${networkName}' not found in config. Available networks: ${Object.keys(config.networks).join(', ')}`);
    }
    return network;
}
/**
 * Get all available networks
 */
function getAvailableNetworks() {
    const config = loadConfig();
    return Object.keys(config.networks);
}
/**
 * Get contract set for network
 */
function getContractSet(networkName) {
    const network = getNetwork(networkName);
    if (!network.contracts) {
        throw new Error(`No contracts deployed on network '${networkName}'. Please deploy contracts first.`);
    }
    return network.contracts;
}
/**
 * Set contract addresses for network
 */
function setContractSet(networkName, contracts) {
    (0, validation_1.validateNetworkName)(networkName);
    // Validate contract addresses
    if (contracts.vault)
        (0, validation_1.validateAddress)(contracts.vault, 'Vault');
    if (contracts.bridge)
        (0, validation_1.validateAddress)(contracts.bridge, 'Bridge');
    if (contracts.pythOracle)
        (0, validation_1.validateAddress)(contracts.pythOracle, 'Pyth Oracle');
    const config = loadConfig();
    if (!config.networks[networkName]) {
        throw new Error(`Network '${networkName}' not found in config`);
    }
    config.networks[networkName].contracts = contracts;
    saveConfig(config);
    logger_1.logger.debug(`Contract set updated for network '${networkName}'`);
}
/**
 * Get token whitelist for network
 */
function getTokenWhitelist(networkName) {
    const network = getNetwork(networkName);
    return network.tokenWhitelist || {};
}
/**
 * Set token whitelist for network
 */
function setTokenWhitelist(networkName, whitelist) {
    (0, validation_1.validateNetworkName)(networkName);
    // Validate token addresses
    for (const tokenAddress of Object.keys(whitelist)) {
        (0, validation_1.validateAddress)(tokenAddress, 'Token');
    }
    const config = loadConfig();
    if (!config.networks[networkName]) {
        throw new Error(`Network '${networkName}' not found in config`);
    }
    config.networks[networkName].tokenWhitelist = whitelist;
    saveConfig(config);
    logger_1.logger.debug(`Token whitelist updated for network '${networkName}'`);
}
/**
 * Add a new network to the configuration
 */
function addNetwork(name, networkConfig) {
    (0, validation_1.validateNetworkName)(name);
    const config = loadConfig();
    config.networks[name] = networkConfig;
    saveConfig(config);
    logger_1.logger.info(`Network '${name}' added to configuration`);
}
/**
 * Remove a network from the configuration
 */
function removeNetwork(name) {
    (0, validation_1.validateNetworkName)(name);
    const config = loadConfig();
    if (!config.networks[name]) {
        throw new Error(`Network '${name}' not found in config`);
    }
    delete config.networks[name];
    saveConfig(config);
    logger_1.logger.info(`Network '${name}' removed from configuration`);
}
/**
 * Get private key from environment variables
 */
function getPrivateKey() {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('Private key not found in environment variables. Please set PRIVATE_KEY in your .env file.');
    }
    return privateKey;
}
