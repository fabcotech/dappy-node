# Dappy-node

Dappy node is a [DoH](https://datatracker.ietf.org/doc/html/rfc8484) and an authoritative name server, written in [NodeJS](https://nodejs.org/).

Dappy zones and records are independant from [ICANN](https://www.icann.org/).
To avoid conflicts with existing TLDs, dappy zones are optionnaly suffixed with `.dappy`.

What makes Dappy-node really unique is that zones are stored on the blockchain [Rchain](https://rchain-community.github.io/) which has 2 main benefits over others blockchain:
- [Rchain](https://rchain-community.github.io/) is able to save data on-chain without referring to auxialiary P2P networks like [IPFS](https://ipfs.io/)
- [Rchain](https://rchain-community.github.io/) scale massively. It produces blocks in parallel and merge them using a DAG and merging strategies.

Persist name zone directly on the blockchains garantees: 
- Records can't be falsified
- Data is highly available throught the network

Records are fetched in a **trustless manner** by requesting network members in parallel, using a mecanism called **co-resolution**. Distributing trust over network is an alternative solution to [DNSSEC](https://datatracker.ietf.org/doc/html/rfc4033).

## Get Dappy-node

### Quick start-up

Run a dappy-node with memory zone provider using npx

```bash
# Run a dappy-node that save zones in memory
DAPPY_NODE_ZONE_PROVIDER=memory DAPPY_NODE_CACHING=0 npx @fabcotech/dappy-node

# Resolve example.dappy A record
dappy-lookup example.dappy A --endpoint=http://127.0.0.1:3001
```

### Other installation procedures

Please refer to [INSTALLATION.md](INSTALLATION.MD) if you want to install a standalone dappy-node or to join an existing Dappy network.

## Understanding Dappy-node

### Zone providers

### DNS over HTTPS

## Support

### Report a bug

### Ask a question

## Reference

### Command line

### Configuration

Three settings are critical to run a rnode instance, and have it joining a RChain network.
- `DAPPY_RCHAIN_BOOTSTRAP` is the bootstrap node that you will first connect to. Please ask RChain dev team for a bootstrap node for a given network.
- `DAPPY_RCHAIN_NETWORK` is the id of the RChain network that you must know prior to connecting, ex: "testbm202107". -
- `DAPPY_RCHAIN_SHARD_NAME` is the shard name ex: "testbm". -

- `DAPPY_NAMES_MASTER_REGISTRY_URI` : A dappy node must be connected to a name system, therefore it must know a registry URI (blockchain address) of a rchain token master deployment. You can run dappy-node without this env. (dappy network with no name system).
- `DAPPY_NETWORK` may be `gamma`, `beta`, `d` or `local` for development.
- `DAPPY_RCHAIN_READ_ONLY` (url) should point to the local url of rnode service in the k8s cluster, leave it as `https://rnode`.
- `DAPPY_RCHAIN_VALIDATOR` (url) should be a public url for a validator node of the same RChain network.
- `DAPPY_RCHAIN_NETWORK` same as above.
- `DAPPY_RCHAIN_SHARD_NAME` same as above.

Dappy jobs are cron jobs, the main one stores log of some rchain token contracts.
- `DAPPY_NAMES_MASTER_REGISTRY_URI` same as above.
- `DAPPY_JOBS_LOGS_CONTRACTS` comma-separated list of contracts you want to keep the logs of. example `dappynamesystem,dappytoken`.

### API.md

## Want contributing ?