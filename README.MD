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

Dappy-node abstracts how zones and records are persisted.

There are 2 zone providers availables:
- memory: for demo and development purpose. It contains a built-in zone `example` with some records. It is the easiest way to start and experiment dappy-node.
- rchain: for production purposes. Zones and records are persisted on blockchain [Rchain](https://rchain-community.github.io/)

Each of these zone providers have their own jobs and routes.

Use `DAPPY_NODE_ZONE_PROVIDER` environment variable to define zone_provider.  

### DNS over HTTPS

Dappy-node is queryable over HTTPS. It implements [DoH](https://datatracker.ietf.org/doc/html/rfc8484) RFC. DNS packets are sent over HTTPS in binary format.

Under the hood, dappy-node use [dns-packet](https://github.com/mafintosh/dns-packet) to decode and encode DNS packets.

Every DoH clients can query dappy-node, it includes browsers like Chrome. Dappy provide a command line [dappy-lookup](https://github.com/fabcotech/dappy-lookup) that makes DoH queries. You can try it like this:

```sh
npx @fabcotech/dappy-lookup example.dappy A --endpoint=http://127.0.0.1:3001
```

## Support

We are open to, and grateful for, any contributions made by the community.

### Report a bug

We use the issue tracker to keep track of bugs and improvements to dappy-node itself and the documentation. We encourage you to open issues to discuss improvements, architecture, theory, internal implementation, etc. If a topic has been discussed before, we will ask you to join the previous discussion.

## Reference

### Command line tools

dappy-node repository contains several command lines tools.

- dappy-init-rchain-genesis-block: create files `.rnode/genesis/bonds.txt` and `rnode/genesis/wallets.txt` needed to bootstrap rchain
- dappy-run-local-rnode: run docker compose file `docker/docker-compose.yml`, which starts the latest images of [rnode](https://hub.docker.com/r/rchain/rnode) and [redis](https://hub.docker.com/_/redis)
- dappy-deploy-name-system: deploy dappy name system master on rchain. Arguments:
   - --validator: url to rchain node validator
   - --privatekey: private key used to deploy dappy name system master
   - --boxid: boxId used to deploy domain tokens
   - --contractid: contract token created
- dappy-node: DoH server. Configuration is described below
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