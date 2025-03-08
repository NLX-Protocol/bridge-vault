import { ethers } from 'ethers';
import { getNetwork, getContractSet, getPrivateKey, setContractSet, getTokenWhitelist, setTokenWhitelist } from './config';
import { TokenInfo, VaultInfo, ContractSet, TokenWhitelist } from './types';
import * as fs from 'fs';
import * as path from 'path';

const VAULT_ABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../../abi/BridgeVault.json'), 'utf8'));

export class VaultContract {
  private contract?: ethers.Contract;
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private networkName: string;

  constructor(networkName: string) {
    this.networkName = networkName;
    const network = getNetwork(networkName);
    this.provider = new ethers.JsonRpcProvider(network.rpcUrl);
    
    // Use the private key from .env file without 0x prefix if it exists
    const privateKey = getPrivateKey().startsWith('0x') 
      ? getPrivateKey() 
      : `0x${getPrivateKey()}`;
      
    const wallet = new ethers.Wallet(privateKey, this.provider);
    this.signer = wallet;
    console.log(`Using address: ${wallet.address}`);
    
    try {
      const contracts = getContractSet(networkName);
      this.contract = new ethers.Contract(contracts.vault, VAULT_ABI, this.signer);
    } catch (error) {
      // Contract not deployed on this network yet
      this.contract = undefined;
    }
  }

  private ensureContract(): void {
    if (!this.contract) {
      throw new Error(`Vault contract not deployed on network ${this.networkName}`);
    }
  }

  async deploy(feeRecipient: string, bridgeContract: string, pythOracle: string): Promise<string> {
    const factory = new ethers.ContractFactory(
      VAULT_ABI,
      fs.readFileSync(path.join(__dirname, '../../contracts/BridgeVault.sol'), 'utf8'),
      this.signer
    );

    const contract = await factory.deploy(feeRecipient, bridgeContract, pythOracle);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    // Save the contract set in the network-specific config
    setContractSet(this.networkName, {
      vault: address,
      bridge: bridgeContract,
      pythOracle: pythOracle
    });
    
    // Update the contract instance
    this.contract = new ethers.Contract(address, VAULT_ABI, this.signer);
    
    return address;
  }

  async updateWhitelist(): Promise<void> {
    this.ensureContract();
    const whitelist = getTokenWhitelist(this.networkName);
    
    for (const [tokenAddress, priceId] of Object.entries(whitelist)) {
      try {
        // Check if token is already whitelisted with the same price feed
        const currentPriceFeed = await this.contract!.tokenPriceFeeds(tokenAddress);
        if (currentPriceFeed === '0x0000000000000000000000000000000000000000000000000000000000000000' || 
            currentPriceFeed !== priceId) {
          const tx = await this.contract!.whitelistToken(tokenAddress, priceId);
          await tx.wait();
          console.log(`Whitelisted token ${tokenAddress} with price feed ${priceId}`);
        }
      } catch (error) {
        console.error(`Failed to whitelist token ${tokenAddress}:`, error);
      }
    }
  }

  async getWhitelistedTokens(): Promise<TokenWhitelist> {
    this.ensureContract();
    const whitelist = getTokenWhitelist(this.networkName);
    const currentWhitelist: TokenWhitelist = {};
    
    for (const tokenAddress of Object.keys(whitelist)) {
      const priceFeed = await this.contract!.tokenPriceFeeds(tokenAddress);
      if (priceFeed !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        currentWhitelist[tokenAddress] = priceFeed;
      }
    }
    
    return currentWhitelist;
  }

  async removeToken(token: string): Promise<void> {
    this.ensureContract();
    const tx = await this.contract!.removeToken(token);
    await tx.wait();
  }

  /**
   * Get the price update fee from Pyth oracle
   * @param priceUpdate The price update data
   * @returns The fee amount in wei
   */
  async getPriceUpdateFee(priceUpdate: string[]): Promise<bigint> {
    this.ensureContract();
    if (!priceUpdate || priceUpdate.length === 0) {
      return 0n;
    }
    
    try {
      // Get the Pyth oracle address from the contract
      const pythOracle = await this.contract!.pythOracle();
      
      // Create a Pyth oracle contract instance
      const pythAbi = [
        'function getUpdateFee(bytes[] calldata priceUpdateData) external view returns (uint256 fee)'
      ];
      const pythContract = new ethers.Contract(pythOracle, pythAbi, this.provider);
      
      // Calculate the price update fee
      return await pythContract.getUpdateFee(priceUpdate);
    } catch (error) {
      console.error('Error getting price update fee:', error);
      // Return a reasonable default if unable to get the exact fee
      return ethers.parseEther('0.001'); // 0.001 ETH as fallback
    }
  }

  /**
   * Estimate bridge transaction fee
   * @param useZro Whether to use ZRO token for payment
   * @param adapterParams Bridge adapter parameters
   * @returns Native fee and ZRO fee
   */
  async estimateBridgeFee(useZro: boolean = false, adapterParams: string = '0x'): Promise<{ nativeFee: bigint, zroFee: bigint }> {
    this.ensureContract();
    try {
      const result = await this.contract!.estimateBridgeFee(useZro, adapterParams);
      const nativeFee = result[0];
      const zroFee = result[1];
      return { nativeFee, zroFee };
    } catch (error) {
      console.error('Error estimating bridge fee:', error);
      // Return a reasonable default if unable to get the exact fee
      return { nativeFee: ethers.parseEther('0.005'), zroFee: 0n }; // 0.005 ETH as fallback
    }
  }

  /**
   * Calculates the total ETH required for a bridge transaction
   * @param priceUpdate The price update data
   * @param useZro Whether to use ZRO token for payment
   * @param adapterParams Bridge adapter parameters
   * @returns Total ETH needed in wei
   */
  async calculateTotalEthRequired(priceUpdate: string[], useZro: boolean = false, adapterParams: string = '0x'): Promise<bigint> {
    const priceUpdateFee = await this.getPriceUpdateFee(priceUpdate);
    const { nativeFee } = await this.estimateBridgeFee(useZro, adapterParams);
    
    // Add a small buffer (10%) to ensure transaction doesn't fail due to price fluctuations
    const buffer = (priceUpdateFee + nativeFee) * 10n / 100n;
    
    return priceUpdateFee + nativeFee + buffer;
  }

  async bridgeVaultTokens(receiver: string, token: string, priceUpdate: string[]): Promise<void> {
    this.ensureContract();
    
    // Calculate required ETH for the transaction
    const totalEthRequired = await this.calculateTotalEthRequired(priceUpdate);
    console.log(`Total ETH required: ${ethers.formatEther(totalEthRequired)} ETH`);
    
    // Use a slightly larger value for the transaction to be safe (add 20% more)
    const safeEthValue = totalEthRequired + (totalEthRequired * 20n / 100n);
    
    // Execute the bridge transaction with the calculated ETH amount
    const tx = await this.contract!.bridgeVaultTokens(receiver, token, priceUpdate || [], {
      value: safeEthValue
    });
    
    await tx.wait();
  }

  async getVault(receiver: string): Promise<string> {
    this.ensureContract();
    return await this.contract!.getVault(receiver);
  }

  async calculateFeeAmount(token: string, priceUpdate: string[]): Promise<bigint> {
    this.ensureContract();
    return await this.contract!.calculateFeeAmount(token, priceUpdate);
  }

  async viewFeeAmount(token: string): Promise<bigint> {
    this.ensureContract();
    return await this.contract!.viewFeeAmount(token);
  }

  async isPaused(): Promise<boolean> {
    this.ensureContract();
    return await this.contract!.paused();
  }

  async pause(): Promise<void> {
    this.ensureContract();
    const tx = await this.contract!.pause();
    await tx.wait();
  }

  async unpause(): Promise<void> {
    this.ensureContract();
    const tx = await this.contract!.unPause();
    await tx.wait();
  }

  async updateBridge(newBridge: string): Promise<void> {
    this.ensureContract();
    const tx = await this.contract!.updateBridge(newBridge);
    await tx.wait();
  }

  async updatePythOracle(newOracle: string): Promise<void> {
    this.ensureContract();
    const tx = await this.contract!.updatePythOracle(newOracle);
    await tx.wait();
  }

  async updateFeeRecipient(newRecipient: string): Promise<void> {
    this.ensureContract();
    const tx = await this.contract!.updateFeeRecipient(newRecipient);
    await tx.wait();
  }

  async updateRemoteChainId(newChainId: number): Promise<void> {
    this.ensureContract();
    const tx = await this.contract!.updateRemoteChainId(newChainId);
    await tx.wait();
  }

  // Original estimateBridgeFee method replaced with the more comprehensive one above
} 