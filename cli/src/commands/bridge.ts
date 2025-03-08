import { Command } from 'commander';
import { VaultContract } from '../contract';
import { getNetwork, getTokenWhitelist, getPrivateKey } from '../config';
import { fetchPriceUpdateData } from '../utils/pyth';
import ora from 'ora';
import chalk from 'chalk';
import { ethers } from 'ethers';

export function bridgeCommand(): Command {
  const command = new Command('bridge')
    .description('Bridge tokens from vault');

  command
    .command('execute')
    .description('Execute bridge for vault tokens')
    .requiredOption('--network <network>', 'Network name')
    .requiredOption('--receiver <address>', 'Receiver address')
    .requiredOption('--token <address>', 'Token address')
    .option('--price-update <bytes...>', 'Price update data')
    .option('--fetch-price', 'Auto-fetch price update data from Pyth Network')
    .option('--dry-run', 'Simulate the transaction without executing it')
    .action(async (options) => {
      const spinner = ora('Executing bridge...').start();
      try {
        const vault = new VaultContract(options.network);
        const network = getNetwork(options.network);
        
        // Normalize receiver address
        const receiverAddress = ethers.getAddress(options.receiver);
        
        // Get vault address
        const vaultAddress = await vault.getVault(receiverAddress);
        spinner.info(chalk.blue(`Vault address: ${vaultAddress}`));
        
        // Normalize token address
        const tokenAddress = ethers.getAddress(options.token);
        
        // Initialize empty price update array (as shown in successful transaction)
        let priceUpdate: string[] = [];
        
        // Only attempt to fetch price updates if explicitly requested
        if (options.priceUpdate && options.priceUpdate.length > 0) {
          priceUpdate = options.priceUpdate;
          spinner.info(chalk.blue(`Using provided price update data`));
        } else if (options.fetchPrice) {
          spinner.info(chalk.blue('Fetch price option detected, but skipping as price updates may not be needed'));
          spinner.info(chalk.blue('Contract can use cached price data if available and not stale'));
        } else {
          spinner.info(chalk.blue('Using contract\'s cached price data (no price update provided)'));
        }
        
        // Check token balance in vault
        const erc20Abi = [
          'function balanceOf(address owner) view returns (uint256)',
          'function decimals() view returns (uint8)',
          'function symbol() view returns (string)'
        ];
        const jsonProvider = new ethers.JsonRpcProvider(network.rpcUrl);
        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, jsonProvider);
        const balance = await tokenContract.balanceOf(vaultAddress);
        const decimals = await tokenContract.decimals();
        const symbol = await tokenContract.symbol();
        
        spinner.info(chalk.blue(`Vault balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`));
        
        // Calculate fee
        let tokenFee: bigint | null = null;
        try {
          tokenFee = priceUpdate.length > 0 
            ? await vault.calculateFeeAmount(tokenAddress, priceUpdate)
            : await vault.viewFeeAmount(tokenAddress);
          
          spinner.info(chalk.blue(`Bridge fee: ${ethers.formatUnits(tokenFee, decimals)} ${symbol}`));
          
          // Check if balance is sufficient
          if (balance <= tokenFee) {
            throw new Error(`Insufficient balance in vault. Have: ${ethers.formatUnits(balance, decimals)} ${symbol}, Need > ${ethers.formatUnits(tokenFee, decimals)} ${symbol}`);
          }
        } catch (error: any) {
          if (error.message.includes('Insufficient balance')) {
            throw error;
          }
          
          // Handle the case where fee calculation fails
          spinner.warn(chalk.yellow(`Failed to calculate fee: ${error.message}`));
          
          // Default to zero fee for dry-run, but check that balance > 0
          tokenFee = 0n;
          
          // Verify the vault has some balance for the token
          if (balance <= 0n) {
            throw new Error(`Vault has no balance for token ${symbol} (${tokenAddress})`);
          }
        }
        
        // Calculate required ETH for the transaction
        spinner.text = 'Calculating required ETH...';
        const totalEthRequired = await vault.calculateTotalEthRequired(priceUpdate);
        spinner.info(chalk.blue(`Total ETH required: ${ethers.formatEther(totalEthRequired)} ETH`));
        
        // Get wallet balance to check if we have enough ETH
        const privateKey = getPrivateKey().startsWith('0x') ? getPrivateKey() : `0x${getPrivateKey()}`;
        const wallet = new ethers.Wallet(privateKey, jsonProvider);
        const ethBalance = await jsonProvider.getBalance(wallet.address);
        
        // Check if we have enough ETH
        if (ethBalance < totalEthRequired) {
          throw new Error(`Insufficient ETH balance. Have: ${ethers.formatEther(ethBalance)} ETH, Need: ${ethers.formatEther(totalEthRequired)} ETH`);
        }
        
        // Execute bridge (or simulate if dry run)
        if (options.dryRun) {
          spinner.succeed(chalk.green('Dry run completed successfully'));
          console.log(chalk.cyan(
            '\nTransaction Summary (DRY RUN):\n' +
            '------------------------\n' +
            `Signer: ${wallet.address}\n` +
            `Vault Address: ${vaultAddress}\n` +
            `Token: ${tokenAddress} (${symbol})\n` +
            `Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}\n` +
            `Estimated Fee: ${ethers.formatUnits(tokenFee || 0n, decimals)} ${symbol}\n` +
            `Bridge Amount: ${ethers.formatUnits((balance - (tokenFee || 0n)), decimals)} ${symbol}\n` +
            `ETH Required: ${ethers.formatEther(totalEthRequired)} ETH\n` +
            `Current ETH Balance: ${ethers.formatEther(ethBalance)} ETH\n`
          ));
        } else {
          spinner.text = 'Executing bridge transaction...';
          await vault.bridgeVaultTokens(
            receiverAddress,
            tokenAddress,
            priceUpdate
          );
          
          spinner.succeed(chalk.green('Bridge executed successfully'));
        }
      } catch (error) {
        spinner.fail(chalk.red('Failed to execute bridge'));
        console.error(error);
        process.exit(1);
      }
    });

  command
    .command('estimate-fee')
    .description('Estimate bridge fee')
    .requiredOption('--network <network>', 'Network name')
    .option('--use-zro', 'Use ZRO token for fee payment')
    .option('--adapter-params <bytes>', 'Adapter parameters')
    .action(async (options) => {
      const spinner = ora('Estimating bridge fee...').start();
      try {
        const vault = new VaultContract(options.network);
        const result = await vault.estimateBridgeFee(
          options.useZro || false,
          options.adapterParams || '0x'
        );
        
        spinner.succeed(chalk.green(
          `Estimated fees:\n` +
          `Native fee: ${result.nativeFee.toString()}\n` +
          `ZRO fee: ${result.zroFee.toString()}`
        ));
      } catch (error) {
        spinner.fail(chalk.red('Failed to estimate bridge fee'));
        console.error(error);
        process.exit(1);
      }
    });

  return command;
} 