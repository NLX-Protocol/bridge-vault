import { Ora, Options as OraOptions } from 'ora';
interface SpinnerOptions {
    text?: string;
    color?: OraOptions['color'];
}
/**
 * Handles a CLI operation with proper spinner and error handling
 * @param operation Function that performs the operation
 * @param options Spinner options
 * @param errorMessage Message to display on error
 */
export declare function withSpinner<T>(operation: () => Promise<T>, options?: SpinnerOptions, errorMessage?: string): Promise<T>;
/**
 * Creates a spinner that can be updated and completed by the caller
 */
export declare function createSpinner(text?: string, color?: OraOptions['color']): Ora;
/**
 * Handles errors in a consistent way
 */
export declare function handleError(error: any, context?: string): never;
/**
 * Formats an address for display (shortens it)
 */
export declare function formatAddress(address: string): string;
/**
 * Formats a price feed ID for display (shortens it)
 */
export declare function formatPriceFeedId(priceFeedId: string): string;
export {};
