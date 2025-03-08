"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withSpinner = withSpinner;
exports.createSpinner = createSpinner;
exports.handleError = handleError;
exports.formatAddress = formatAddress;
exports.formatPriceFeedId = formatPriceFeedId;
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = require("./logger");
/**
 * Handles a CLI operation with proper spinner and error handling
 * @param operation Function that performs the operation
 * @param options Spinner options
 * @param errorMessage Message to display on error
 */
async function withSpinner(operation, options = {}, errorMessage = 'Operation failed') {
    const spinner = (0, ora_1.default)({
        text: options.text || 'Processing...',
        color: options.color || 'blue'
    }).start();
    try {
        const result = await operation();
        spinner.succeed(chalk_1.default.green('Operation completed successfully'));
        return result;
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(errorMessage));
        logger_1.logger.error(error.message || 'Unknown error occurred');
        // Throw the error so it can be caught by the command
        throw error;
    }
}
/**
 * Creates a spinner that can be updated and completed by the caller
 */
function createSpinner(text = 'Processing...', color = 'blue') {
    return (0, ora_1.default)({
        text,
        color
    }).start();
}
/**
 * Handles errors in a consistent way
 */
function handleError(error, context = '') {
    const contextMsg = context ? ` while ${context}` : '';
    const errorMsg = error.message || 'Unknown error occurred';
    logger_1.logger.error(`Error${contextMsg}: ${errorMsg}`);
    // Log stack trace in debug mode
    logger_1.logger.debug('Stack trace:', error.stack);
    process.exit(1);
}
/**
 * Formats an address for display (shortens it)
 */
function formatAddress(address) {
    if (address.length <= 10)
        return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}
/**
 * Formats a price feed ID for display (shortens it)
 */
function formatPriceFeedId(priceFeedId) {
    if (priceFeedId.length <= 10)
        return priceFeedId;
    return `${priceFeedId.substring(0, 6)}...${priceFeedId.substring(priceFeedId.length - 4)}`;
}
