import * as fs from 'fs';
import * as path from 'path';
import { Config, NetworkConfig } from './types';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_CONFIG: Config = {
  networks: {
    arbitrum: {
      rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      chainId: 42161,
      name: 'Arbitrum One'
    },
    localhost: {
      rpcUrl: 'http://127.0.0.1:8545',
      chainId: 31337,
      name: 'Localhost'
    }
  },
  contracts: {}
};

const CONFIG_PATH = path.join(process.cwd(), 'vault-config.json');

export function loadConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: Config): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving config:', error);
  }
}

export function getNetwork(networkName: string): NetworkConfig {
  const config = loadConfig();
  const network = config.networks[networkName];
  if (!network) {
    throw new Error(`Network ${networkName} not found in config`);
  }
  return network;
}

export function getContractAddress(contractName: string): string {
  const config = loadConfig();
  const address = config.contracts[contractName];
  if (!address) {
    throw new Error(`Contract ${contractName} not found in config`);
  }
  return address;
}

export function setContractAddress(contractName: string, address: string): void {
  const config = loadConfig();
  config.contracts[contractName] = address;
  saveConfig(config);
}

export function addNetwork(name: string, networkConfig: NetworkConfig): void {
  const config = loadConfig();
  config.networks[name] = networkConfig;
  saveConfig(config);
}

export function getPrivateKey(): string {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Private key not found in environment variables');
  }
  return privateKey;
} 