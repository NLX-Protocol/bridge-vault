import axios from 'axios';

/**
 * Fetches price update data for a specific price feed ID from Pyth Network
 * @param priceFeedId The Pyth price feed ID
 * @param networkId The network ID (e.g., 42161 for Arbitrum)
 * @returns Encoded price update data
 */
export async function fetchPriceUpdateData(priceFeedId: string, networkId: number): Promise<string[]> {
  // Pyth Network price service URL
  const pythServiceUrl = 'https://hermes.pyth.network/api/latest_price_feeds';
  
  try {
    // Fetch the latest price feed data
    const response = await axios.get(`${pythServiceUrl}?ids[]=${priceFeedId}`);
    
    if (!response.data || response.data.length === 0) {
      throw new Error(`No price data found for price feed ID: ${priceFeedId}`);
    }
    
    // Get the price update data for the specified network
    const updateData = await axios.get(
      `https://hermes.pyth.network/api/latest_vaas?ids[]=${priceFeedId}&encoding=hex&target_chains[]=${networkId}`
    );
    
    if (!updateData.data || updateData.data.length === 0) {
      throw new Error(`No price update data available for network ID: ${networkId}`);
    }
    
    // Ensure data is properly formatted as hex strings with 0x prefix
    return updateData.data.map((data: any) => {
      // If it's a string and doesn't start with 0x, add the prefix
      if (typeof data === 'string') {
        return data.startsWith('0x') ? data : `0x${data}`;
      }
      
      // If it's a binary array, convert to hex string with 0x prefix
      if (data.type === 'Buffer' && Array.isArray(data.data)) {
        return '0x' + Buffer.from(data.data).toString('hex');
      }
      
      throw new Error(`Unexpected price update data format: ${typeof data}`);
    });
  } catch (error: any) {
    throw new Error(`Failed to fetch price update data: ${error.message}`);
  }
}