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
exports.VaultContract = void 0;
const ethers_1 = require("ethers");
const config_1 = require("./config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const VAULT_ABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../../abi/BridgeVault.json'), 'utf8'));
class VaultContract {
    constructor(networkName) {
        this.networkName = networkName;
        const network = (0, config_1.getNetwork)(networkName);
        this.provider = new ethers_1.ethers.JsonRpcProvider(network.rpcUrl);
        // Use the private key from .env file without 0x prefix if it exists
        const privateKey = (0, config_1.getPrivateKey)().startsWith('0x')
            ? (0, config_1.getPrivateKey)()
            : `0x${(0, config_1.getPrivateKey)()}`;
        const wallet = new ethers_1.ethers.Wallet(privateKey, this.provider);
        this.signer = wallet;
        console.log(`Using address: ${wallet.address}`);
        try {
            const contracts = (0, config_1.getContractSet)(networkName);
            this.contract = new ethers_1.ethers.Contract(contracts.vault, VAULT_ABI, this.signer);
        }
        catch (error) {
            // Contract not deployed on this network yet
            this.contract = undefined;
        }
    }
    ensureContract() {
        if (!this.contract) {
            throw new Error(`Vault contract not deployed on network ${this.networkName}`);
        }
    }
    async deploy(feeRecipient, bridgeContract, pythOracle) {
        const factory = new ethers_1.ethers.ContractFactory(VAULT_ABI, fs.readFileSync(path.join(__dirname, '../../contracts/BridgeVault.sol'), 'utf8'), this.signer);
        const contract = await factory.deploy(feeRecipient, bridgeContract, pythOracle);
        await contract.waitForDeployment();
        const address = await contract.getAddress();
        // Save the contract set in the network-specific config
        (0, config_1.setContractSet)(this.networkName, {
            vault: address,
            bridge: bridgeContract,
            pythOracle: pythOracle
        });
        // Update the contract instance
        this.contract = new ethers_1.ethers.Contract(address, VAULT_ABI, this.signer);
        return address;
    }
    async updateWhitelist() {
        this.ensureContract();
        const whitelist = (0, config_1.getTokenWhitelist)(this.networkName);
        for (const [tokenAddress, priceId] of Object.entries(whitelist)) {
            try {
                // Check if token is already whitelisted with the same price feed
                const currentPriceFeed = await this.contract.tokenPriceFeeds(tokenAddress);
                if (currentPriceFeed === '0x0000000000000000000000000000000000000000000000000000000000000000' ||
                    currentPriceFeed !== priceId) {
                    const tx = await this.contract.whitelistToken(tokenAddress, priceId);
                    await tx.wait();
                    console.log(`Whitelisted token ${tokenAddress} with price feed ${priceId}`);
                }
            }
            catch (error) {
                console.error(`Failed to whitelist token ${tokenAddress}:`, error);
            }
        }
    }
    async getWhitelistedTokens() {
        this.ensureContract();
        const whitelist = (0, config_1.getTokenWhitelist)(this.networkName);
        const currentWhitelist = {};
        for (const tokenAddress of Object.keys(whitelist)) {
            const priceFeed = await this.contract.tokenPriceFeeds(tokenAddress);
            if (priceFeed !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                currentWhitelist[tokenAddress] = priceFeed;
            }
        }
        return currentWhitelist;
    }
    async removeToken(token) {
        this.ensureContract();
        const tx = await this.contract.removeToken(token);
        await tx.wait();
    }
    /**
     * Get the price update fee from Pyth oracle
     * @param priceUpdate The price update data
     * @returns The fee amount in wei
     */
    async getPriceUpdateFee(priceUpdate) {
        this.ensureContract();
        if (!priceUpdate || priceUpdate.length === 0) {
            return 0n;
        }
        try {
            // Get the Pyth oracle address from the contract
            const pythOracle = await this.contract.pythOracle();
            // Create a Pyth oracle contract instance
            const pythAbi = [
                'function getUpdateFee(bytes[] calldata priceUpdateData) external view returns (uint256 fee)'
            ];
            const pythContract = new ethers_1.ethers.Contract(pythOracle, pythAbi, this.provider);
            // Calculate the price update fee
            return await pythContract.getUpdateFee(priceUpdate);
        }
        catch (error) {
            console.error('Error getting price update fee:', error);
            // Return a reasonable default if unable to get the exact fee
            return ethers_1.ethers.parseEther('0.001'); // 0.001 ETH as fallback
        }
    }
    /**
     * Estimate bridge transaction fee
     * @param useZro Whether to use ZRO token for payment
     * @param adapterParams Bridge adapter parameters
     * @returns Native fee and ZRO fee
     */
    async estimateBridgeFee(useZro = false, adapterParams = '0x') {
        this.ensureContract();
        try {
            const result = await this.contract.estimateBridgeFee(useZro, adapterParams);
            const nativeFee = result[0];
            const zroFee = result[1];
            return { nativeFee, zroFee };
        }
        catch (error) {
            console.error('Error estimating bridge fee:', error);
            // Return a reasonable default if unable to get the exact fee
            return { nativeFee: ethers_1.ethers.parseEther('0.005'), zroFee: 0n }; // 0.005 ETH as fallback
        }
    }
    /**
     * Calculates the total ETH required for a bridge transaction
     * @param priceUpdate The price update data
     * @param useZro Whether to use ZRO token for payment
     * @param adapterParams Bridge adapter parameters
     * @returns Total ETH needed in wei
     */
    async calculateTotalEthRequired(priceUpdate, useZro = false, adapterParams = '0x') {
        const priceUpdateFee = await this.getPriceUpdateFee(priceUpdate);
        const { nativeFee } = await this.estimateBridgeFee(useZro, adapterParams);
        // Add a small buffer (10%) to ensure transaction doesn't fail due to price fluctuations
        const buffer = (priceUpdateFee + nativeFee) * 10n / 100n;
        return priceUpdateFee + nativeFee + buffer;
    }
    async bridgeVaultTokens(receiver, token, priceUpdate) {
        this.ensureContract();
        // Calculate required ETH for the transaction
        const totalEthRequired = await this.calculateTotalEthRequired(priceUpdate);
        console.log(`Total ETH required: ${ethers_1.ethers.formatEther(totalEthRequired)} ETH`);
        // Use a slightly larger value for the transaction to be safe (add 20% more)
        const safeEthValue = totalEthRequired + (totalEthRequired * 20n / 100n);
        // Execute the bridge transaction with the calculated ETH amount
        const tx = await this.contract.bridgeVaultTokens(receiver, token, priceUpdate || [], {
            value: safeEthValue
        });
        await tx.wait();
    }
    async getVault(receiver) {
        this.ensureContract();
        return await this.contract.getVault(receiver);
    }
    async calculateFeeAmount(token, priceUpdate) {
        this.ensureContract();
        return await this.contract.calculateFeeAmount(token, priceUpdate);
    }
    async viewFeeAmount(token) {
        this.ensureContract();
        return await this.contract.viewFeeAmount(token);
    }
    async isPaused() {
        this.ensureContract();
        return await this.contract.paused();
    }
    async pause() {
        this.ensureContract();
        const tx = await this.contract.pause();
        await tx.wait();
    }
    async unpause() {
        this.ensureContract();
        const tx = await this.contract.unPause();
        await tx.wait();
    }
    async updateBridge(newBridge) {
        this.ensureContract();
        const tx = await this.contract.updateBridge(newBridge);
        await tx.wait();
    }
    async updatePythOracle(newOracle) {
        this.ensureContract();
        const tx = await this.contract.updatePythOracle(newOracle);
        await tx.wait();
    }
    async updateFeeRecipient(newRecipient) {
        this.ensureContract();
        const tx = await this.contract.updateFeeRecipient(newRecipient);
        await tx.wait();
    }
    async updateRemoteChainId(newChainId) {
        this.ensureContract();
        const tx = await this.contract.updateRemoteChainId(newChainId);
        await tx.wait();
    }
}
exports.VaultContract = VaultContract;
