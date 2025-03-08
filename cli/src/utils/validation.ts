import { ethers } from 'ethers';
import { logger } from './logger';

export function isValidAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch (error) {
    return false;
  }
}

export function isValidNetworkName(name: string): boolean {
  // Names should be alphanumeric with possible hyphens
  return /^[a-zA-Z0-9-]+$/.test(name);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

export function isValidChainId(chainId: number): boolean {
  return Number.isInteger(chainId) && chainId > 0;
}

export function validateAddress(address: string, context: string): void {
  if (!isValidAddress(address)) {
    logger.error(`Invalid ${context} address: ${address}`);
    throw new Error(`Invalid ${context} address: ${address}`);
  }
}

export function validateNetworkName(name: string): void {
  if (!isValidNetworkName(name)) {
    logger.error(`Invalid network name: ${name}. Use alphanumeric characters and hyphens only.`);
    throw new Error(`Invalid network name: ${name}. Use alphanumeric characters and hyphens only.`);
  }
}

export function validateUrl(url: string, context: string): void {
  if (!isValidUrl(url)) {
    logger.error(`Invalid ${context} URL: ${url}`);
    throw new Error(`Invalid ${context} URL: ${url}`);
  }
}

export function validateChainId(chainId: number): void {
  if (!isValidChainId(chainId)) {
    logger.error(`Invalid chain ID: ${chainId}. Must be a positive integer.`);
    throw new Error(`Invalid chain ID: ${chainId}. Must be a positive integer.`);
  }
}

export function validateConfig(config: any): string[] {
  const errors: string[] = [];
  
  if (!config.networks || typeof config.networks !== 'object') {
    errors.push('Configuration missing or invalid "networks" object');
  } else {
    for (const [networkName, networkConfig] of Object.entries(config.networks)) {
      if (!isValidNetworkName(networkName)) {
        errors.push(`Invalid network name: ${networkName}`);
      }
      
      const network = networkConfig as any;
      if (!network.rpcUrl || !isValidUrl(network.rpcUrl)) {
        errors.push(`Network ${networkName} has invalid or missing rpcUrl`);
      }
      
      if (!Number.isInteger(network.chainId) || network.chainId <= 0) {
        errors.push(`Network ${networkName} has invalid or missing chainId`);
      }
      
      if (!network.name || typeof network.name !== 'string') {
        errors.push(`Network ${networkName} has invalid or missing name`);
      }
      
      if (network.contracts) {
        if (network.contracts.vault && !isValidAddress(network.contracts.vault)) {
          errors.push(`Network ${networkName} has invalid vault contract address`);
        }
        
        if (network.contracts.bridge && !isValidAddress(network.contracts.bridge)) {
          errors.push(`Network ${networkName} has invalid bridge contract address`);
        }
        
        if (network.contracts.pythOracle && !isValidAddress(network.contracts.pythOracle)) {
          errors.push(`Network ${networkName} has invalid pythOracle contract address`);
        }
      }
      
      if (network.tokenWhitelist) {
        for (const [tokenAddress, priceFeedId] of Object.entries(network.tokenWhitelist)) {
          if (!isValidAddress(tokenAddress)) {
            errors.push(`Network ${networkName} has invalid token address in whitelist: ${tokenAddress}`);
          }
          
          if (typeof priceFeedId !== 'string') {
            errors.push(`Network ${networkName} has invalid price feed ID for token ${tokenAddress}`);
          }
        }
      }
    }
  }
  
  return errors;
}