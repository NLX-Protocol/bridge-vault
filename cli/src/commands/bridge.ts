import { Command } from 'commander';
import { VaultContract } from '../contract';
import ora from 'ora';
import chalk from 'chalk';

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
    .action(async (options) => {
      const spinner = ora('Executing bridge...').start();
      try {
        const vault = new VaultContract(options.network);
        
        // Get vault address
        const vaultAddress = await vault.getVault(options.receiver);
        spinner.info(chalk.blue(`Vault address: ${vaultAddress}`));
        
        // Calculate fee if price update is provided
        if (options.priceUpdate) {
          const fee = await vault.calculateFeeAmount(options.token, options.priceUpdate);
          spinner.info(chalk.blue(`Bridge fee: ${fee.toString()}`));
        }
        
        // Execute bridge
        await vault.bridgeVaultTokens(
          options.receiver,
          options.token,
          options.priceUpdate || []
        );
        
        spinner.succeed(chalk.green('Bridge executed successfully'));
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
        const [nativeFee, zroFee] = await vault.estimateBridgeFee(
          options.useZro || false,
          options.adapterParams || '0x'
        );
        
        spinner.succeed(chalk.green(
          `Estimated fees:\n` +
          `Native fee: ${nativeFee.toString()}\n` +
          `ZRO fee: ${zroFee.toString()}`
        ));
      } catch (error) {
        spinner.fail(chalk.red('Failed to estimate bridge fee'));
        console.error(error);
        process.exit(1);
      }
    });

  return command;
} 