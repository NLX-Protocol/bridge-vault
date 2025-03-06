import { Command } from 'commander';
import { VaultContract } from '../contract';
import { setContractAddress } from '../config';
import ora from 'ora';
import chalk from 'chalk';

export function deployCommand(): Command {
  const command = new Command('deploy')
    .description('Deploy the Vault contract')
    .requiredOption('--network <network>', 'Network to deploy to')
    .requiredOption('--fee-recipient <address>', 'Fee recipient address')
    .requiredOption('--bridge-contract <address>', 'Bridge contract address')
    .requiredOption('--pyth-oracle <address>', 'Pyth oracle address')
    .action(async (options) => {
      const spinner = ora('Deploying Vault contract...').start();
      try {
        const vault = new VaultContract(options.network);
        const address = await vault.deploy(
          options.feeRecipient,
          options.bridgeContract,
          options.pythOracle
        );
        
        setContractAddress('vault', address);
        
        spinner.succeed(chalk.green(`Vault contract deployed at: ${address}`));
      } catch (error) {
        spinner.fail(chalk.red('Failed to deploy Vault contract'));
        console.error(error);
        process.exit(1);
      }
    });

  return command;
} 