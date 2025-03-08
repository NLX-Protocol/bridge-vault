"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCommand = adminCommand;
const commander_1 = require("commander");
const contract_1 = require("../contract");
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
function adminCommand() {
    const command = new commander_1.Command('admin')
        .description('Administrative commands');
    command
        .command('pause')
        .description('Pause the contract')
        .requiredOption('--network <network>', 'Network name')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Pausing contract...').start();
        try {
            const vault = new contract_1.VaultContract(options.network);
            await vault.pause();
            spinner.succeed(chalk_1.default.green('Contract paused'));
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Failed to pause contract'));
            console.error(error);
            process.exit(1);
        }
    });
    command
        .command('unpause')
        .description('Unpause the contract')
        .requiredOption('--network <network>', 'Network name')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Unpausing contract...').start();
        try {
            const vault = new contract_1.VaultContract(options.network);
            await vault.unpause();
            spinner.succeed(chalk_1.default.green('Contract unpaused'));
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Failed to unpause contract'));
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
        const spinner = (0, ora_1.default)('Updating bridge contract...').start();
        try {
            const vault = new contract_1.VaultContract(options.network);
            await vault.updateBridge(options.address);
            spinner.succeed(chalk_1.default.green(`Bridge contract updated to ${options.address}`));
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Failed to update bridge contract'));
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
        const spinner = (0, ora_1.default)('Updating Pyth oracle...').start();
        try {
            const vault = new contract_1.VaultContract(options.network);
            await vault.updatePythOracle(options.address);
            spinner.succeed(chalk_1.default.green(`Pyth oracle updated to ${options.address}`));
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Failed to update Pyth oracle'));
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
        const spinner = (0, ora_1.default)('Updating fee recipient...').start();
        try {
            const vault = new contract_1.VaultContract(options.network);
            await vault.updateFeeRecipient(options.address);
            spinner.succeed(chalk_1.default.green(`Fee recipient updated to ${options.address}`));
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Failed to update fee recipient'));
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
        const spinner = (0, ora_1.default)('Updating remote chain ID...').start();
        try {
            const vault = new contract_1.VaultContract(options.network);
            await vault.updateRemoteChainId(parseInt(options.chainId));
            spinner.succeed(chalk_1.default.green(`Remote chain ID updated to ${options.chainId}`));
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Failed to update remote chain ID'));
            console.error(error);
            process.exit(1);
        }
    });
    return command;
}
