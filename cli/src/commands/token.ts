import { Command } from 'commander';
import { VaultContract } from '../contract';
import ora from 'ora';
import chalk from 'chalk';

export function tokenCommand(): Command {
  const command = new Command('token')
    .description('Manage whitelisted tokens');

  command
    .command('whitelist')
    .description('Whitelist a token')
    .requiredOption('--network <network>', 'Network name')
    .requiredOption('--token <address>', 'Token address')
    .requiredOption('--price-id <bytes32>', 'Pyth price feed ID')
    .action(async (options) => {
      const spinner = ora('Whitelisting token...').start();
      try {
        const vault = new VaultContract(options.network);
        await vault.whitelistToken(options.token, options.priceId);
        spinner.succeed(chalk.green(`Token ${options.token} whitelisted with price feed ${options.priceId}`));
      } catch (error) {
        spinner.fail(chalk.red('Failed to whitelist token'));
        console.error(error);
        process.exit(1);
      }
    });

  command
    .command('remove')
    .description('Remove a token from whitelist')
    .requiredOption('--network <network>', 'Network name')
    .requiredOption('--token <address>', 'Token address')
    .action(async (options) => {
      const spinner = ora('Removing token from whitelist...').start();
      try {
        const vault = new VaultContract(options.network);
        await vault.removeToken(options.token);
        spinner.succeed(chalk.green(`Token ${options.token} removed from whitelist`));
      } catch (error) {
        spinner.fail(chalk.red('Failed to remove token'));
        console.error(error);
        process.exit(1);
      }
    });

  command
    .command('fee')
    .description('View token fee amount')
    .requiredOption('--network <network>', 'Network name')
    .requiredOption('--token <address>', 'Token address')
    .action(async (options) => {
      const spinner = ora('Fetching fee amount...').start();
      try {
        const vault = new VaultContract(options.network);
        const feeAmount = await vault.viewFeeAmount(options.token);
        spinner.succeed(chalk.green(`Fee amount for token ${options.token}: ${feeAmount.toString()}`));
      } catch (error) {
        spinner.fail(chalk.red('Failed to fetch fee amount'));
        console.error(error);
        process.exit(1);
      }
    });

  return command;
} 