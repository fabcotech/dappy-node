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

# Launch dappy-node (http on port 3001, https on port 3002)
dappy-node
```
### With docker

#### Prerequisites

Please, install following binaries:
- [Node](https://nodejs.org/) >= 16
- [Docker](https://docs.docker.com/get-docker/)

#### Deploy and run a local dappy name system

```sh
# Create .rnode folder with genesis block
dappy-init-rchain-genesis-block

# Run local rnode, propose blocks, and redis using docker and docker-compose 
dappy-run-local-rnode

# Deploy Dappy name system on local rnode
dappy-deploy-name-system

# Launch dappy-node (http on port 3001, https on port 3002)
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

Restart your terminal to refresh you PATH
```sh
# Deploy Dappy name system on local rnode
dappy-deploy-name-system

# Launch dappy-node (http on port 3001, https on port 3002)
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