/**
 * Fetches price update data for a specific price feed ID from Pyth Network
 * @param priceFeedId The Pyth price feed ID
 * @param networkId The network ID (e.g., 42161 for Arbitrum)
 * @returns Encoded price update data
 */
export declare function fetchPriceUpdateData(priceFeedId: string, networkId: number): Promise<string[]>;
