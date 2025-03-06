import { ethers } from 'ethers';

export interface NetworkConfig {
  rpcUrl: string;
  chainId: number;
  name: string;
}

export interface Config {
  networks: {
    [key: string]: NetworkConfig;
  };
  contracts: {
    [key: string]: string;
  };
  privateKey?: string;
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