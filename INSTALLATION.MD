# Installation

## For a local usage 

### With binaries
#### Prerequisites

Please, install following binaries:
- [Node](https://nodejs.org/) >= 16
- [Redis](https://redis.io/docs/getting-started/#install-redis)
- [Rchain](https://rchain.coop/developer.html)

Be sure to run:
- a rchain node as described in this [tutorial](https://rchain.coop/developer.html)
- redis

Install globally `fabcotech/dappy-node` package 
```sh
npm i -g @fabcotech/dappy-node      # DoH server
```

#### Deploy and run a local dappy name system

```sh
# Deploy Dappy name system on local rnode
dappy-deploy-name-system

# Launch dappy-node (http on port 3001)
dappy-node
```
### With docker

#### Prerequisites

Please, install following binaries:
- [Node](https://nodejs.org/) >= 16
- [Docker](https://docs.docker.com/get-docker/)

Install globally `@fabcotech/dappy-node` package 
```sh
npm i -g @fabcotech/dappy-node
```

#### Deploy and run a local dappy name system

Restart your terminal to refresh you $PATH
```sh
# Create .rnode folder with genesis block
dappy-init-rchain-genesis-block

# Run local rnode, propose blocks, and redis using docker and docker-compose 
dappy-run-local-rnode

# Deploy Dappy name system on local rnode
dappy-deploy-name-system

# Launch dappy-node (http on port 3001)
dappy-node
```

### From sources
#### Prerequisites

Please, install following binaries:
- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Node](https://nodejs.org/) >= 16
- [Redis](https://redis.io/docs/getting-started/#install-redis)
- [Rchain](https://rchain.coop/developer.html)

Be sure to run:
- a rchain node as described in this [tutorial](https://rchain.coop/developer.html)
- redis

#### Build and run dappy-node

```sh
# Fetch latest dappy-node source code
git pull https://github.com/fabcotech/dappy-node.git

# Install dependencies, build and create package
npm install && npm run build && npm pack

# Install dappy-node globally
npm install -g fabcotech-dappy-node-X.XX.XX.tgz
```

Restart your terminal to refresh you $PATH
```sh
# Deploy Dappy name system on local rnode
dappy-deploy-name-system

# Launch dappy-node (http on port 3001)
dappy-node
```

### With kubernetes and minikube

To install dappy, rnode and redis in a local kubernetes cluster, please follow this [procedure](/kubernetes/envs/minikube/MINIKUBE.md).

### Test local dappy-node

```
# Deploy example domain
cat << EOF > dappy.config.json
{
  "zones": [
    {
      "origin": "example",
      "ttl": 3600,
      "records": [
        {
          "name": "@",
          "type": "A",
          "data": "127.0.0.1"
        }
      ]
    }
  ]
}
EOF
npx @fabcotech/dappy-cli pushzones 

# lookup example A record
npx @fabcotech/dappy-lookup example A --endpoint=http://127.0.0.1:3001
```

## To be part of an existing dappy network 

### Available dappy networks

Here are all available dappy networks and their corresponding environment variables.

|  | **gamma** | **beta** | **d** |
|---|---|---|---|
| DAPPY_NAMES_MASTER_REGISTRY_URI | eakdr9k4q37b1gq879jwsfq38autx8bm3tjz6wbdw5pjfkwb5got9f | TBD | TBD |
| DAPPY_NAMES_BOX_ID | eakboxns | TBD | TBD |
| DAPPY_NAMES_CONTRACT_ID | eakcontractns | TBD | TBD |
| DAPPY_JOBS_LOGS_CONTRACTS | eakcontractns | TBD |  TBD|
| DAPPY_NETWORK | gamma | TBD | TBD |
| DAPPY_RCHAIN_NETWORK | testnet220309 | TBD | TBD |
| DAPPY_RCHAIN_VALIDATOR | https://node0.testnet.rchain.coop | TBD | TBD |

Please choose a dappy network and save corresponding environments variables to `dappyrc` file. It is loaded at startup by `dappy-node`.

Your dappy-node will need to be secure with TLSv1.3.
You have to generate a certificate, we will ask you during the onboarding process.

Ask dappy to join the network

### With binaries

#### Prerequisites

Please, install following binaries:
- [Node](https://nodejs.org/) >= 16
- [Redis](https://redis.io/docs/getting-started/#install-redis)
- [Rchain](https://rchain.coop/developer.html)

Be sure to run:
- a rchain node as described in this [tutorial](https://rchain.coop/developer.html)
- redis

Install globally `fabcotech/dappy-node` package

#### Deploy and run a local dappy name system

```sh
# Launch dappy-node (http on port 3001, https on port 3002)
dappy-node
```

### On Ubuntu without docker

[Here](UBUNTU.MD) is a procedure to install dappy-node on Ubuntu without docker.

### With sources

#### Prerequisites

Please, install following binaries:
- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Node](https://nodejs.org/) >= 16
- [Redis](https://redis.io/docs/getting-started/#install-redis)
- [Rchain](https://rchain.coop/developer.html)

Be sure to run:
- a rchain node as described in this [tutorial](https://rchain.coop/developer.html)
- redis

#### Build and run dappy-node

```sh
# Fetch latest dappy-node source code
git pull https://github.com/fabcotech/dappy-node.git

# Install dependencies, build and create package
npm install && npm run build && npm pack

# Install dappy-node globally
npm install -g fabcotech-dappy-node-X.XX.XX.tgz
```

Restart your terminal to refresh you $PATH
```sh
# Launch dappy-node (http on port 3001, https on port 3002)
dappy-node
```

### With kubernetes

To get a production ready dappy-node infrastructure, we strongly recommand you to deploy dappy-node using kubernetes. It will give you the basics for an infrastructure that is scalable, secured, resilient and that can be supervised.
Kubernetes is also cloud agnostic, and all cloud specific components like load balancers and network services are well identified.

In folder [kubernetes](/kubernetes/), we provide some kubernetes manifests to install dappy-node on [Scaleway](https://www.scaleway.com/), a french cloud provider that hosts `gamma` and `beta` fabco nodes. The corresponding installation procedure is avalaible [here](/kubernetes/KUBERNETES.md).

Feel free to use these manifests to produce your owns.