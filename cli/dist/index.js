#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const deploy_1 = require("./commands/deploy");
const token_1 = require("./commands/token");
const bridge_1 = require("./commands/bridge");
const admin_1 = require("./commands/admin");
const program = new commander_1.Command();
program
    .name('vault')
    .description('CLI tool for managing Bridge Vault contract')
    .version('1.0.0');
program.addCommand((0, deploy_1.deployCommand)());
program.addCommand((0, token_1.tokenCommand)());
program.addCommand((0, bridge_1.bridgeCommand)());
program.addCommand((0, admin_1.adminCommand)());
program.parse(process.argv);
