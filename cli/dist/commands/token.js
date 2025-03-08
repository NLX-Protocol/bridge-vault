"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenCommand = tokenCommand;
const commander_1 = require("commander");
const contract_1 = require("../contract");
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
function tokenCommand() {
    const command = new commander_1.Command('token')
        .description('Manage whitelisted tokens');
    command
        .command('update-whitelist')
        .description('Update token whitelist from config')
        .requiredOption('--network <network>', 'Network name')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Updating token whitelist...').start();
        try {
            const vault = new contract_1.VaultContract(options.network);
            await vault.updateWhitelist();
            // Get current whitelist status
            const currentWhitelist = await vault.getWhitelistedTokens();
            spinner.succeed(chalk_1.default.green('Token whitelist updated'));
            console.log('\nCurrent whitelist:');
            for (const [token, priceId] of Object.entries(currentWhitelist)) {
                console.log(chalk_1.default.blue(`${token}: ${priceId}`));
            }
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Failed to update token whitelist'));
            console.error(error);
            process.exit(1);
        }
    });
    command
        .command('show')
        .description('Show current token whitelist')
        .requiredOption('--network <network>', 'Network name')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Fetching token whitelist...').start();
        try {
            const vault = new contract_1.VaultContract(options.network);
            const whitelist = await vault.getWhitelistedTokens();
            spinner.succeed(chalk_1.default.green('Current token whitelist:'));
            for (const [token, priceId] of Object.entries(whitelist)) {
                console.log(chalk_1.default.blue(`${token}: ${priceId}`));
            }
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Failed to fetch token whitelist'));
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
        const spinner = (0, ora_1.default)('Fetching fee amount...').start();
        try {
            const vault = new contract_1.VaultContract(options.network);
            const feeAmount = await vault.viewFeeAmount(options.token);
            spinner.succeed(chalk_1.default.green(`Fee amount for token ${options.token}: ${feeAmount.toString()}`));
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Failed to fetch fee amount'));
            console.error(error);
            process.exit(1);
        }
    });
    return command;
}
