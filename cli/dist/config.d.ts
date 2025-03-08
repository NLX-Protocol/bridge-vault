import { Config, NetworkConfig, ContractSet, TokenWhitelist } from './types';
/**
 * Attempt to load config from multiple locations
 */
export declare function loadConfig(): Config;
/**
 * Save config to file
 */
export declare function saveConfig(config: Config): void;
/**
 * Get network configuration
 */
export declare function getNetwork(networkName: string): NetworkConfig;
/**
 * Get all available networks
 */
export declare function getAvailableNetworks(): string[];
/**
 * Get contract set for network
 */
export declare function getContractSet(networkName: string): ContractSet;
/**
 * Set contract addresses for network
 */
export declare function setContractSet(networkName: string, contracts: ContractSet): void;
/**
 * Get token whitelist for network
 */
export declare function getTokenWhitelist(networkName: string): TokenWhitelist;
/**
 * Set token whitelist for network
 */
export declare function setTokenWhitelist(networkName: string, whitelist: TokenWhitelist): void;
/**
 * Add a new network to the configuration
 */
export declare function addNetwork(name: string, networkConfig: NetworkConfig): void;
/**
 * Remove a network from the configuration
 */
export declare function removeNetwork(name: string): void;
/**
 * Get private key from environment variables
 */
export declare function getPrivateKey(): string;
