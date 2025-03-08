import { Command } from 'commander';
import { VaultContract } from '../contract';
import { getTokenWhitelist, setTokenWhitelist } from '../config';
import ora from 'ora';
import chalk from 'chalk';

export function tokenCommand(): Command {
  const command = new Command('token')
    .description('Manage whitelisted tokens');

  command
    .command('update-whitelist')
    .description('Update token whitelist from config')
    .requiredOption('--network <network>', 'Network name')
    .action(async (options) => {
      const spinner = ora('Updating token whitelist...').start();
      try {
        const vault = new VaultContract(options.network);
        await vault.updateWhitelist();
        
        // Get current whitelist status
        const currentWhitelist = await vault.getWhitelistedTokens();
        
        spinner.succeed(chalk.green('Token whitelist updated'));
        console.log('\nCurrent whitelist:');
        for (const [token, priceId] of Object.entries(currentWhitelist)) {
          console.log(chalk.blue(`${token}: ${priceId}`));
        }
      } catch (error) {
        spinner.fail(chalk.red('Failed to update token whitelist'));
        console.error(error);
        process.exit(1);
      }
    });

  command
    .command('show')
    .description('Show current token whitelist')
    .requiredOption('--network <network>', 'Network name')
    .action(async (options) => {
      const spinner = ora('Fetching token whitelist...').start();
      try {
        const vault = new VaultContract(options.network);
        const whitelist = await vault.getWhitelistedTokens();
        
        spinner.succeed(chalk.green('Current token whitelist:'));
        for (const [token, priceId] of Object.entries(whitelist)) {
          console.log(chalk.blue(`${token}: ${priceId}`));
        }
      } catch (error) {
        spinner.fail(chalk.red('Failed to fetch token whitelist'));
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