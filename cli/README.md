# Bridge Vault CLI

A command-line interface for managing the Bridge Vault contract.

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the CLI:
```bash
npm run build
```

3. Link the CLI globally:
```bash
npm link
```

## Configuration

Create a `.env` file with the following variables:
```
PRIVATE_KEY=your_private_key
ARBITRUM_RPC_URL=your_arbitrum_rpc_url
```

## Usage

### Deploy Contract
```bash
vault deploy --network <network> --fee-recipient <address> --bridge-contract <address> --pyth-oracle <address>
```

### Token Management
```bash
# Whitelist a token
vault token whitelist --network <network> --token <address> --price-id <bytes32>

# Remove a token from whitelist
vault token remove --network <network> --token <address>

# View token fee
vault token fee --network <network> --token <address>
```

### Bridge Operations
```bash
# Execute bridge
vault bridge execute --network <network> --receiver <address> --token <address> [--price-update <bytes...>]

# Estimate bridge fee
vault bridge estimate-fee --network <network> [--use-zro] [--adapter-params <bytes>]
```

### Administrative Commands
```bash
# Pause contract
vault admin pause --network <network>

# Unpause contract
vault admin unpause --network <network>

# Update bridge contract
vault admin update-bridge --network <network> --address <address>

# Update Pyth oracle
vault admin update-oracle --network <network> --address <address>

# Update fee recipient
vault admin update-fee-recipient --network <network> --address <address>

# Update remote chain ID
vault admin update-chain-id --network <network> --chain-id <number>
```

## Networks

The CLI supports the following networks by default:
- `arbitrum`: Arbitrum One mainnet
- `localhost`: Local development network

To add a new network, you can modify the configuration in `src/config.ts`. 