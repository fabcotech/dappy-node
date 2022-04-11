# Dappy-node

Dappy node is a [DoH](https://datatracker.ietf.org/doc/html/rfc8484) and an authoritative name server, written in [NodeJS](https://nodejs.org/).

Dappy zones and records are independant from [ICANN](https://www.icann.org/).
To avoid conflicts with existing TLDs, dappy zones are optionnaly suffixed with `.dappy`.

What makes Dappy-node really unique is that zones are stored on the blockchain [Rchain](https://rchain-community.github.io/) which has 2 main benefits over others blockchain:
- [Rchain](https://rchain-community.github.io/) is able to save data on-chain without referring to auxialiary P2P networks like [IPFS](https://ipfs.io/)
- [Rchain](https://rchain-community.github.io/) scale massively. It produces blocks in parallel using a DAG and by applying merging them.

Persist name zone directly on the blockchains garantees: 
- Records can't be falsified
- Data is highly available throught the network

Records are fetched in a **trustless manner** by requesting network members in parallel, using a mecanism called **co-resolution**. Distributing trust over network is an alternative solution to [DNSSEC](https://datatracker.ietf.org/doc/html/rfc4033).

## Get Dappy-node

### Quick start-up

Run a dappy-node with memory zone provider using npx

### Other installations

## Understanding Dappy-node

### Zone providers

### DNS over HTTPS

## Support

### Report a bug

### Ask a question

## Reference

### Command line

### Configuration

### API.md

## Want contributing ?