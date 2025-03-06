import { Command } from 'commander';
import { VaultContract } from '../contract';
import ora from 'ora';
import chalk from 'chalk';

export function adminCommand(): Command {
  const command = new Command('admin')
    .description('Administrative commands');

  command
    .command('pause')
    .description('Pause the contract')
    .requiredOption('--network <network>', 'Network name')
    .action(async (options) => {
      const spinner = ora('Pausing contract...').start();
      try {
        const vault = new VaultContract(options.network);
        await vault.pause();
        spinner.succeed(chalk.green('Contract paused'));
      } catch (error) {
        spinner.fail(chalk.red('Failed to pause contract'));
        console.error(error);
        process.exit(1);
      }
    });

  command
    .command('unpause')
    .description('Unpause the contract')
    .requiredOption('--network <network>', 'Network name')
    .action(async (options) => {
      const spinner = ora('Unpausing contract...').start();
      try {
        const vault = new VaultContract(options.network);
        await vault.unpause();
        spinner.succeed(chalk.green('Contract unpaused'));
      } catch (error) {
        spinner.fail(chalk.red('Failed to unpause contract'));
        console.error(error);
        process.exit(1);
      }
    });

  command
    .command('update-bridge')
    .description('Update bridge contract address')
    .requiredOption('--network <network>', 'Network name')
    .requiredOption('--address <address>', 'New bridge contract address')
    .action(async (options) => {
      const spinner = ora('Updating bridge contract...').start();
      try {
        const vault = new VaultContract(options.network);
        await vault.updateBridge(options.address);
        spinner.succeed(chalk.green(`Bridge contract updated to ${options.address}`));
      } catch (error) {
        spinner.fail(chalk.red('Failed to update bridge contract'));
        console.error(error);
        process.exit(1);
      }
    });

  command
    .command('update-oracle')
    .description('Update Pyth oracle address')
    .requiredOption('--network <network>', 'Network name')
    .requiredOption('--address <address>', 'New oracle address')
    .action(async (options) => {
      const spinner = ora('Updating Pyth oracle...').start();
      try {
        const vault = new VaultContract(options.network);
        await vault.updatePythOracle(options.address);
        spinner.succeed(chalk.green(`Pyth oracle updated to ${options.address}`));
      } catch (error) {
        spinner.fail(chalk.red('Failed to update Pyth oracle'));
        console.error(error);
        process.exit(1);
      }
    });

  command
    .command('update-fee-recipient')
    .description('Update fee recipient address')
    .requiredOption('--network <network>', 'Network name')
    .requiredOption('--address <address>', 'New fee recipient address')
    .action(async (options) => {
      const spinner = ora('Updating fee recipient...').start();
      try {
        const vault = new VaultContract(options.network);
        await vault.updateFeeRecipient(options.address);
        spinner.succeed(chalk.green(`Fee recipient updated to ${options.address}`));
      } catch (error) {
        spinner.fail(chalk.red('Failed to update fee recipient'));
        console.error(error);
        process.exit(1);
      }
    });

  command
    .command('update-chain-id')
    .description('Update remote chain ID')
    .requiredOption('--network <network>', 'Network name')
    .requiredOption('--chain-id <number>', 'New chain ID')
    .action(async (options) => {
      const spinner = ora('Updating remote chain ID...').start();
      try {
        const vault = new VaultContract(options.network);
        await vault.updateRemoteChainId(parseInt(options.chainId));
        spinner.succeed(chalk.green(`Remote chain ID updated to ${options.chainId}`));
      } catch (error) {
        spinner.fail(chalk.red('Failed to update remote chain ID'));
        console.error(error);
        process.exit(1);
      }
    });

  return command;
} 