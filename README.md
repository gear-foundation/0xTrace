### 0xTrace

![Logo](./public/logo.png)

[![Build Status](https://github.com/StackOverflowExcept1on/0xTrace/actions/workflows/ci.yml/badge.svg)](https://github.com/StackOverflowExcept1on/stealth-wallet-frontend/actions/workflows/ci.yml)

Yet another ERC-5564 (Stealth Addresses) wallet, but with storage on Vara Network

### White paper

[0xTrace White Paper](./public/stealth-addresses-article.pdf)

### Smart contracts

- **announcer**: [announcer](./contracts/announcer) is the program responsible for announcing stealth addresses on Vara
  Network.
- **registry**: [registry](./contracts/registry) is the program responsible for storing stealth addresses on Vara
  Network.
- **beer-market**: [beer-market](./contracts/beer-market) is a simple contract that demonstrates how to hide user
  behavior on the blockchain (for example, we want to hide the fact that someone buys beer on Friday).

### Installing

```bash
yarn install
```

### Linting

```bash
yarn run lint
yarn run lint:fix
```

### Building

```bash
cp .env.test .env
yarn run build
```

### Running

```bash
cp .env.test .env
yarn run dev
```
