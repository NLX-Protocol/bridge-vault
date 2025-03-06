import { ethers } from 'ethers';
import { getNetwork, getContractAddress, getPrivateKey } from './config';
import { TokenInfo, VaultInfo } from './types';
import * as fs from 'fs';
import * as path from 'path';

const VAULT_ABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../../abi/BridgeVault.json'), 'utf8'));

export class VaultContract {
  private contract: ethers.Contract;
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(networkName: string) {
    const network = getNetwork(networkName);
    this.provider = new ethers.JsonRpcProvider(network.rpcUrl);
    this.signer = new ethers.Wallet(getPrivateKey(), this.provider);
    const vaultAddress = getContractAddress('vault');
    this.contract = new ethers.Contract(vaultAddress, VAULT_ABI, this.signer);
  }

  async deploy(feeRecipient: string, bridgeContract: string, pythOracle: string): Promise<string> {
    const factory = new ethers.ContractFactory(
      VAULT_ABI,
      fs.readFileSync(path.join(__dirname, '../../contracts/BridgeVault.sol'), 'utf8'),
      this.signer
    );

    const contract = await factory.deploy(feeRecipient, bridgeContract, pythOracle);
    await contract.waitForDeployment();
    return await contract.getAddress();
  }

  async whitelistToken(token: string, priceId: string): Promise<void> {
    const tx = await this.contract.whitelistToken(token, priceId);
    await tx.wait();
  }

  async removeToken(token: string): Promise<void> {
    const tx = await this.contract.removeToken(token);
    await tx.wait();
  }

  async bridgeVaultTokens(receiver: string, token: string, priceUpdate: string[]): Promise<void> {
    const tx = await this.contract.bridgeVaultTokens(receiver, token, priceUpdate, {
      value: ethers.parseEther('0.01') // Add some ETH for price updates and bridge fees
    });
    await tx.wait();
  }

  async getVault(receiver: string): Promise<string> {
    return await this.contract.getVault(receiver);
  }

  async calculateFeeAmount(token: string, priceUpdate: string[]): Promise<bigint> {
    return await this.contract.calculateFeeAmount(token, priceUpdate);
  }

  async viewFeeAmount(token: string): Promise<bigint> {
    return await this.contract.viewFeeAmount(token);
  }

  async isPaused(): Promise<boolean> {
    return await this.contract.paused();
  }

  async pause(): Promise<void> {
    const tx = await this.contract.pause();
    await tx.wait();
  }

  async unpause(): Promise<void> {
    const tx = await this.contract.unPause();
    await tx.wait();
  }

  async updateBridge(newBridge: string): Promise<void> {
    const tx = await this.contract.updateBridge(newBridge);
    await tx.wait();
  }

  async updatePythOracle(newOracle: string): Promise<void> {
    const tx = await this.contract.updatePythOracle(newOracle);
    await tx.wait();
  }

  async updateFeeRecipient(newRecipient: string): Promise<void> {
    const tx = await this.contract.updateFeeRecipient(newRecipient);
    await tx.wait();
  }

  async updateRemoteChainId(newChainId: number): Promise<void> {
    const tx = await this.contract.updateRemoteChainId(newChainId);
    await tx.wait();
  }

  async estimateBridgeFee(useZro: boolean, adapterParams: string): Promise<[bigint, bigint]> {
    return await this.contract.estimateBridgeFee(useZro, adapterParams);
  }
} 