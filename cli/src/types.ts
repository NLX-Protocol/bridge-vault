import { ethers } from 'ethers';

export interface ContractSet {
  vault: string;
  bridge: string;
  pythOracle: string;
}

export interface TokenWhitelist {
  [tokenAddress: string]: string; // token address -> price feed id
}

export interface NetworkConfig {
  rpcUrl: string;
  chainId: number;
  name: string;
  contracts?: ContractSet;
  tokenWhitelist?: TokenWhitelist;
}

export interface Config {
  networks: {
    [key: string]: NetworkConfig;
  };
}

export interface TokenInfo {
  address: string;
  priceId: string;
  symbol: string;
  decimals: number;
}

export interface VaultInfo {
  address: string;
  balances: {
    [tokenAddress: string]: string;
  };
}

export interface BridgeParams {
  receiver: string;
  token: string;
  priceUpdate: string[];
} 