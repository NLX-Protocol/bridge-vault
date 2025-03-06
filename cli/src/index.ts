#!/usr/bin/env node

import { Command } from 'commander';
import { deployCommand } from './commands/deploy';
import { tokenCommand } from './commands/token';
import { bridgeCommand } from './commands/bridge';
import { adminCommand } from './commands/admin';

const program = new Command();

program
  .name('vault')
  .description('CLI tool for managing Bridge Vault contract')
  .version('1.0.0');

program.addCommand(deployCommand());
program.addCommand(tokenCommand());
program.addCommand(bridgeCommand());
program.addCommand(adminCommand());

program.parse(process.argv); 