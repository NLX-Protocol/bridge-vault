# Bridge Vault

A Solidity smart contract system for cross-chain token bridging with deterministic vault deployment.

## Overview

This project implements a vault system for securely storing and bridging tokens across chains:

- **Vault**: Individual user vaults deployed deterministically with Create2
- **VaultFactory**: Main contract for deploying vaults and executing bridge transactions
- **Pyth Oracle Integration**: For calculating fees in USD terms

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository

2. Install dependencies
```
npm install
```

3. Create an environment file
```
cp .env.example .env
```

4. Update the `.env` file with your configuration:
- Add your private key for deployment
- Add API keys for networks and verification services
- Configure contract addresses (feeRecipient, bridgeContract, pythOracle)

### Compilation

```
npm run compile
```

### Testing

```
npm test
```

### Local Deployment

1. Start a local blockchain node
```
npm run node
```

2. Deploy the contracts to the local node (in a separate terminal)
```
npm run deploy:local
```

### Mainnet/Testnet Deployment

1. Make sure your `.env` file is properly configured

2. Run the deployment script with the target network
```
npx hardhat run scripts/deploy.js --network <network-name>
```

## Contract Verification

After deployment, verify your contract:
```
npx hardhat verify --network <network-name> <deployed-address> <constructor-args>
```

Or use the shortcut:
```
npm run verify -- --network <network-name> <deployed-address> <constructor-args>
```

## License

MIT