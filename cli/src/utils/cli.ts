import ora, { Ora, Options as OraOptions } from 'ora';
import chalk from 'chalk';
import { logger } from './logger';

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
export async function withSpinner<T>(
  operation: () => Promise<T>,
  options: SpinnerOptions = {},
  errorMessage: string = 'Operation failed'
): Promise<T> {
  const spinner = ora({
    text: options.text || 'Processing...',
    color: options.color || 'blue'
  }).start();

  try {
    const result = await operation();
    spinner.succeed(chalk.green('Operation completed successfully'));
    return result;
  } catch (error: any) {
    spinner.fail(chalk.red(errorMessage));
    logger.error(error.message || 'Unknown error occurred');
    
    // Throw the error so it can be caught by the command
    throw error;
  }
}

/**
 * Creates a spinner that can be updated and completed by the caller
 */
export function createSpinner(
  text: string = 'Processing...',
  color: OraOptions['color'] = 'blue'
): Ora {
  return ora({
    text,
    color
  }).start();
}

/**
 * Handles errors in a consistent way
 */
export function handleError(error: any, context: string = ''): never {
  const contextMsg = context ? ` while ${context}` : '';
  const errorMsg = error.message || 'Unknown error occurred';
  logger.error(`Error${contextMsg}: ${errorMsg}`);
  
  // Log stack trace in debug mode
  logger.debug('Stack trace:', error.stack);
  
  process.exit(1);
}

/**
 * Formats an address for display (shortens it)
 */
export function formatAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Formats a price feed ID for display (shortens it)
 */
export function formatPriceFeedId(priceFeedId: string): string {
  if (priceFeedId.length <= 10) return priceFeedId;
  return `${priceFeedId.substring(0, 6)}...${priceFeedId.substring(priceFeedId.length - 4)}`;
}