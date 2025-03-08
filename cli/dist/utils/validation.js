"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidAddress = isValidAddress;
exports.isValidNetworkName = isValidNetworkName;
exports.isValidUrl = isValidUrl;
exports.isValidChainId = isValidChainId;
exports.validateAddress = validateAddress;
exports.validateNetworkName = validateNetworkName;
exports.validateUrl = validateUrl;
exports.validateChainId = validateChainId;
exports.validateConfig = validateConfig;
const ethers_1 = require("ethers");
const logger_1 = require("./logger");
function isValidAddress(address) {
    try {
        return ethers_1.ethers.isAddress(address);
    }
    catch (error) {
        return false;
    }
}
function isValidNetworkName(name) {
    // Names should be alphanumeric with possible hyphens
    return /^[a-zA-Z0-9-]+$/.test(name);
}
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch (error) {
        return false;
    }
}
function isValidChainId(chainId) {
    return Number.isInteger(chainId) && chainId > 0;
}
function validateAddress(address, context) {
    if (!isValidAddress(address)) {
        logger_1.logger.error(`Invalid ${context} address: ${address}`);
        throw new Error(`Invalid ${context} address: ${address}`);
    }
}
function validateNetworkName(name) {
    if (!isValidNetworkName(name)) {
        logger_1.logger.error(`Invalid network name: ${name}. Use alphanumeric characters and hyphens only.`);
        throw new Error(`Invalid network name: ${name}. Use alphanumeric characters and hyphens only.`);
    }
}
function validateUrl(url, context) {
    if (!isValidUrl(url)) {
        logger_1.logger.error(`Invalid ${context} URL: ${url}`);
        throw new Error(`Invalid ${context} URL: ${url}`);
    }
}
function validateChainId(chainId) {
    if (!isValidChainId(chainId)) {
        logger_1.logger.error(`Invalid chain ID: ${chainId}. Must be a positive integer.`);
        throw new Error(`Invalid chain ID: ${chainId}. Must be a positive integer.`);
    }
}
function validateConfig(config) {
    const errors = [];
    if (!config.networks || typeof config.networks !== 'object') {
        errors.push('Configuration missing or invalid "networks" object');
    }
    else {
        for (const [networkName, networkConfig] of Object.entries(config.networks)) {
            if (!isValidNetworkName(networkName)) {
                errors.push(`Invalid network name: ${networkName}`);
            }
            const network = networkConfig;
            if (!network.rpcUrl || !isValidUrl(network.rpcUrl)) {
                errors.push(`Network ${networkName} has invalid or missing rpcUrl`);
            }
            if (!Number.isInteger(network.chainId) || network.chainId <= 0) {
                errors.push(`Network ${networkName} has invalid or missing chainId`);
            }
            if (!network.name || typeof network.name !== 'string') {
                errors.push(`Network ${networkName} has invalid or missing name`);
            }
            if (network.contracts) {
                if (network.contracts.vault && !isValidAddress(network.contracts.vault)) {
                    errors.push(`Network ${networkName} has invalid vault contract address`);
                }
                if (network.contracts.bridge && !isValidAddress(network.contracts.bridge)) {
                    errors.push(`Network ${networkName} has invalid bridge contract address`);
                }
                if (network.contracts.pythOracle && !isValidAddress(network.contracts.pythOracle)) {
                    errors.push(`Network ${networkName} has invalid pythOracle contract address`);
                }
            }
            if (network.tokenWhitelist) {
                for (const [tokenAddress, priceFeedId] of Object.entries(network.tokenWhitelist)) {
                    if (!isValidAddress(tokenAddress)) {
                        errors.push(`Network ${networkName} has invalid token address in whitelist: ${tokenAddress}`);
                    }
                    if (typeof priceFeedId !== 'string') {
                        errors.push(`Network ${networkName} has invalid price feed ID for token ${tokenAddress}`);
                    }
                }
            }
        }
    }
    return errors;
}
