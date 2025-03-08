import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Config, NetworkConfig, ContractSet, TokenWhitelist } from './types';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { validateConfig, validateNetworkName, validateAddress } from './utils/validation';
import { Cache } from './utils/cache';

// Load environment variables
dotenv.config();

// Initialize cache for config
const configCache = new Cache('config', 30 * 1000); // 30 seconds cache

const DEFAULT_CONFIG: Config = {
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
export function loadConfig(): Config {
  // Try to get from cache first
  const cachedConfig = configCache.get<Config>('config');
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
        const errors = validateConfig(mergedConfig);
        if (errors.length > 0) {
          logger.warn(`Config validation warnings for ${configPath}:`);
          errors.forEach(error => logger.warn(`- ${error}`));
        }
        
        // Cache the config
        configCache.set('config', mergedConfig);
        
        return mergedConfig;
      }
    } catch (error: any) {
      logger.error(`Error loading config from ${configPath}: ${error.message}`);
    }
  }

  // If no config found, create default config
  logger.warn('No config file found. Using default configuration.');
  createDefaultConfig();
  
  // Cache the default config
  configCache.set('config', DEFAULT_CONFIG);
  
  return DEFAULT_CONFIG;
}

/**
 * Create a default config file if none exists
 */
function createDefaultConfig(): void {
  try {
    const configDir = path.dirname(CONFIG_PATHS[0]);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(CONFIG_PATHS[0], JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
    logger.info(`Created default config at ${CONFIG_PATHS[0]}`);
  } catch (error: any) {
    logger.error(`Failed to create default config: ${error.message}`);
  }
}

/**
 * Deep merge two objects
 */
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Save config to file
 */
export function saveConfig(config: Config): void {
  try {
    // Validate config before saving
    const errors = validateConfig(config);
    if (errors.length > 0) {
      logger.warn('Config validation warnings:');
      errors.forEach(error => logger.warn(`- ${error}`));
    }
    
    const configPath = CONFIG_PATHS[0];
    const configDir = path.dirname(configPath);
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    
    // Update cache
    configCache.set('config', config);
    
    logger.debug(`Config saved to ${configPath}`);
  } catch (error: any) {
    logger.error(`Error saving config: ${error.message}`);
    throw new Error(`Failed to save configuration: ${error.message}`);
  }
}

/**
 * Get network configuration
 */
export function getNetwork(networkName: string): NetworkConfig {
  validateNetworkName(networkName);
  
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
export function getAvailableNetworks(): string[] {
  const config = loadConfig();
  return Object.keys(config.networks);
}

/**
 * Get contract set for network
 */
export function getContractSet(networkName: string): ContractSet {
  const network = getNetwork(networkName);
  
  if (!network.contracts) {
    throw new Error(`No contracts deployed on network '${networkName}'. Please deploy contracts first.`);
  }
  
  return network.contracts;
}

/**
 * Set contract addresses for network
 */
export function setContractSet(networkName: string, contracts: ContractSet): void {
  validateNetworkName(networkName);
  
  // Validate contract addresses
  if (contracts.vault) validateAddress(contracts.vault, 'Vault');
  if (contracts.bridge) validateAddress(contracts.bridge, 'Bridge');
  if (contracts.pythOracle) validateAddress(contracts.pythOracle, 'Pyth Oracle');
  
  const config = loadConfig();
  
  if (!config.networks[networkName]) {
    throw new Error(`Network '${networkName}' not found in config`);
  }
  
  config.networks[networkName].contracts = contracts;
  saveConfig(config);
  
  logger.debug(`Contract set updated for network '${networkName}'`);
}

/**
 * Get token whitelist for network
 */
export function getTokenWhitelist(networkName: string): TokenWhitelist {
  const network = getNetwork(networkName);
  return network.tokenWhitelist || {};
}

/**
 * Set token whitelist for network
 */
export function setTokenWhitelist(networkName: string, whitelist: TokenWhitelist): void {
  validateNetworkName(networkName);
  
  // Validate token addresses
  for (const tokenAddress of Object.keys(whitelist)) {
    validateAddress(tokenAddress, 'Token');
  }
  
  const config = loadConfig();
  
  if (!config.networks[networkName]) {
    throw new Error(`Network '${networkName}' not found in config`);
  }
  
  config.networks[networkName].tokenWhitelist = whitelist;
  saveConfig(config);
  
  logger.debug(`Token whitelist updated for network '${networkName}'`);
}

/**
 * Add a new network to the configuration
 */
export function addNetwork(name: string, networkConfig: NetworkConfig): void {
  validateNetworkName(name);
  
  const config = loadConfig();
  config.networks[name] = networkConfig;
  saveConfig(config);
  
  logger.info(`Network '${name}' added to configuration`);
}

/**
 * Remove a network from the configuration
 */
export function removeNetwork(name: string): void {
  validateNetworkName(name);
  
  const config = loadConfig();
  
  if (!config.networks[name]) {
    throw new Error(`Network '${name}' not found in config`);
  }
  
  delete config.networks[name];
  saveConfig(config);
  
  logger.info(`Network '${name}' removed from configuration`);
}

/**
 * Get private key from environment variables
 */
export function getPrivateKey(): string {
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error('Private key not found in environment variables. Please set PRIVATE_KEY in your .env file.');
  }
  
  return privateKey;
} 