"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployCommand = deployCommand;
const commander_1 = require("commander");
const contract_1 = require("../contract");
const config_1 = require("../config");
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
function deployCommand() {
    const command = new commander_1.Command('deploy')
        .description('Deploy the Vault contract')
        .requiredOption('--network <network>', 'Network to deploy to')
        .requiredOption('--fee-recipient <address>', 'Fee recipient address')
        .requiredOption('--bridge-contract <address>', 'Bridge contract address')
        .requiredOption('--pyth-oracle <address>', 'Pyth oracle address')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Deploying Vault contract...').start();
        try {
            const vault = new contract_1.VaultContract(options.network);
            const address = await vault.deploy(options.feeRecipient, options.bridgeContract, options.pythOracle);
            (0, config_1.setContractSet)(options.network, {
                vault: address,
                bridge: options.bridgeContract,
                pythOracle: options.pythOracle
            });
            spinner.succeed(chalk_1.default.green(`Vault contract deployed at: ${address}`));
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Failed to deploy Vault contract'));
            console.error(error);
            process.exit(1);
        }
    });
    return command;
}
