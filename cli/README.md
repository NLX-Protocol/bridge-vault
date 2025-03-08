# Bridge Vault CLI

A command-line interface for managing the Bridge Vault contract across multiple chains.

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

1. Create a `.env` file with the following variables:
```
PRIVATE_KEY=your_private_key
ARBITRUM_RPC_URL=your_arbitrum_rpc_url
# Add other network RPC URLs as needed
```

2. Create a `vault-config.json` file (you can copy from `vault-config.example.json`):
```json
{
  "networks": {
    "arbitrum": {
      "rpcUrl": "https://arb1.arbitrum.io/rpc",
      "chainId": 42161,
      "name": "Arbitrum One",
      "contracts": {
        "vault": "0x...",    // Vault contract address
        "bridge": "0x...",   // Bridge contract address
        "pythOracle": "0x..." // Pyth oracle address
      },
      "tokenWhitelist": {
        "0x1234...": "0xabcd...", // Token address -> Pyth price feed ID mapping
        "0x5678...": "0xefgh..."
      }
    },
    "localhost": {
      "rpcUrl": "http://127.0.0.1:8545",
      "chainId": 31337,
      "name": "Localhost",
      "contracts": {
        "vault": "0x..." // Contract address on local network
      }
    }
  }
}
```

Each network has its own set of contracts (vault, bridge, and Pyth oracle) and token whitelist configuration.

## Usage

### Deploy Contract
Deploy a new vault contract on a specific network:
```bash
vault deploy --network <network> --fee-recipient <address> --bridge-contract <address> --pyth-oracle <address>
```

### Token Management
Manage whitelisted tokens using the configuration file:

1. Add tokens to the whitelist by updating the `tokenWhitelist` in your `vault-config.json`:
```json
{
  "networks": {
    "arbitrum": {
      "tokenWhitelist": {
        "0x1234...": "0xabcd...", // Add token address and its Pyth price feed ID
        "0x5678...": "0xefgh..."
      }
    }
  }
}
```

2. Apply the whitelist configuration:
```bash
# Update token whitelist from config
vault token update-whitelist --network <network>

# Show current whitelisted tokens
vault token show --network <network>

# View token fee
vault token fee --network <network> --token <address>
```

### Bridge Operations
Execute bridge operations between networks:
```bash
# Execute bridge
vault bridge execute --network <network> --receiver <address> --token <address> [--price-update <bytes...>]

# Estimate bridge fee
vault bridge estimate-fee --network <network> [--use-zro] [--adapter-params <bytes>]
```

### Administrative Commands
Manage vault contracts on specific networks:
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

The CLI supports multiple networks, each with its own deployed contract set. By default, it includes:
- `arbitrum`: Arbitrum One mainnet
- `localhost`: Local development network

To add a new network:
1. Add the network's RPC URL to your `.env` file
2. Add the network configuration to your `vault-config.json`
3. Deploy the contract set to the new network using the `deploy` command
4. Configure the token whitelist for the network

## Adding a New Network

Example of adding a new network to the configuration:
```json
{
  "networks": {
    "optimism": {
      "rpcUrl": "${OPTIMISM_RPC_URL}",
      "chainId": 10,
      "name": "Optimism",
      "contracts": {},
      "tokenWhitelist": {}
    }
  }
}
```

After adding the network configuration:
1. Deploy the contract set using the `deploy` command
2. Add tokens to the whitelist in the config file
3. Run `vault token update-whitelist` to apply the whitelist 