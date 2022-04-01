# Installation

## RChain node for local development 

How to install RChain ? [Click here](https://github.com/rchain/rchain#installation)

```sh
./scripts/init_rchain_genesis_block.sh

# Fetch latest rchain node
docker pull rchain/rnode:latest

# Run a local rchain node for develpement
docker run -v $HOME/.rnode:/var/lib/rnode -it -p 40400:40400 -p 40403:40403 rchain/rnode:latest \
 run \
  -s \
  --validator-private-key 28a5c9ac133b4449ca38e9bdf7cacdce31079ef6b3ac2f0a080af83ecff98b36 \
  --dev-mode
```

