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
### dappy-node Configuration

dappy-node is configurable through environments variables.
To be more convenient, dappy-node try to load a [.env file](https://github.com/motdotla/dotenv) named `dappyrc` at startup.

Below, here are all environments variables read by dappy-node.
#### General environment variables

| **Keys** | **Required** | **Default value** | **Description** |
|---|---|---|---|
| DAPPY_NODE_ZONE_PROVIDER | No | `rchain` | Zone provider used |
| DAPPY_NODE_HTTP_PORT | Yes | `3001` | dappy-node http port  |
| DAPPY_NODE_HTTPS_PORT | No |  | dappy-node https port |
| DAPPY_NODE_PRIVATE_KEY_FILENAME | No | `dappynode.key` | dappy-node private key. Generated if not exists |
| DAPPY_NODE_CERTIFICATE_FILENAME | No | `dappynode.crt` | dappy-node certificate. Generated if not exists |
| DAPPY_NODE_CACHING | Yes | `60` | record ttl cache. Disabled if set to `0` |
| DAPPY_NODE_ENABLE_REQUEST_METRICS | Yes | `false` | Activate metrics |
| DAPPY_NODE_SENTRY_URL | No | `false` | Send logs to sentry |
| DAPPY_NETWORK | Yes | `unknown` | `unknown`, `gamma`, `beta` or `d` |
| DAPPY_LOG_PATH | Yes | `./logs` | path to log warning and errors |
| NODES_FILE | No |  |  |

#### Environment variables read when rchain is used as zone provider

| **Keys** | **Required** | **Default value** | **Description** |
|---|---|---|---|
| DAPPY_NAMES_MASTER_REGISTRY_URI | Yes |  | rchain token master deployment |
| DAPPY_NAMES_CONTRACT_ID | Yes |  | rchain contract used for dappy name system |
| DAPPY_RCHAIN_VALIDATOR | Yes | `http://localhost:40403` | Rnode used to send transactions |
| DAPPY_RCHAIN_READ_ONLY | Yes | `http://localhost:40403` | Rnode used to query rchain data |
| DAPPY_RCHAIN_NETWORK | Yes | `unknown` | RChain network |
| DAPPY_JOBS_LOGS_CONTRACTS | Yes | | Ccomma-separated list of contracts you want to keep the logs |
| DAPPY_JOBS_REDIS_URL |  Yes | | Redis url format: `redis://HOST:PORT/DB` |
| DAPPY_RCHAIN_READ_ONLY_CERTIFICATE_FILENAME | Yes |  | Rnode certificate  |
| DAPPY_NODE_LAST_BLOCK_JOB_INTERVAL | Yes | `40000` | Interval in ms to fetch rchain data |
| DAPPY_NODE_START_JOBS | Yes | `false` |  |
| DAPPY_NODE_REDIS_DB | Yes | `1` | Redis database number |
| DAPPY_NODE_REDIS_HOST | Yes | `localhost` | Redis host |
| DAPPY_NODE_REDIS_PORT | Yes | `6379` | Redis port |

### API.md

## Want contributing ?