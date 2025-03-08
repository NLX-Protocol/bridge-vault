import { TokenWhitelist } from './types';
export declare class VaultContract {
    private contract?;
    private provider;
    private signer;
    private networkName;
    constructor(networkName: string);
    private ensureContract;
    deploy(feeRecipient: string, bridgeContract: string, pythOracle: string): Promise<string>;
    updateWhitelist(): Promise<void>;
    getWhitelistedTokens(): Promise<TokenWhitelist>;
    removeToken(token: string): Promise<void>;
    /**
     * Get the price update fee from Pyth oracle
     * @param priceUpdate The price update data
     * @returns The fee amount in wei
     */
    getPriceUpdateFee(priceUpdate: string[]): Promise<bigint>;
    /**
     * Estimate bridge transaction fee
     * @param useZro Whether to use ZRO token for payment
     * @param adapterParams Bridge adapter parameters
     * @returns Native fee and ZRO fee
     */
    estimateBridgeFee(useZro?: boolean, adapterParams?: string): Promise<{
        nativeFee: bigint;
        zroFee: bigint;
    }>;
    /**
     * Calculates the total ETH required for a bridge transaction
     * @param priceUpdate The price update data
     * @param useZro Whether to use ZRO token for payment
     * @param adapterParams Bridge adapter parameters
     * @returns Total ETH needed in wei
     */
    calculateTotalEthRequired(priceUpdate: string[], useZro?: boolean, adapterParams?: string): Promise<bigint>;
    bridgeVaultTokens(receiver: string, token: string, priceUpdate: string[]): Promise<void>;
    getVault(receiver: string): Promise<string>;
    calculateFeeAmount(token: string, priceUpdate: string[]): Promise<bigint>;
    viewFeeAmount(token: string): Promise<bigint>;
    isPaused(): Promise<boolean>;
    pause(): Promise<void>;
    unpause(): Promise<void>;
    updateBridge(newBridge: string): Promise<void>;
    updatePythOracle(newOracle: string): Promise<void>;
    updateFeeRecipient(newRecipient: string): Promise<void>;
    updateRemoteChainId(newChainId: number): Promise<void>;
}
