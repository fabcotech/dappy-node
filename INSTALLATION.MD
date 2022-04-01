# Installation

## For a local environment

### Prerequisites
```sh
npm i -g @fabcotech/dappy-node
npm i -g @fabcotech/dappy-cli
npm i -g @fabcotech/dappy-lookup
```

### Deploy and run a local dappy name system

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

### Test

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
dappy-cli pushzones 

# lookup example A record
npm i -g @fabcotech/dappy-lookup
cat << EOF > network.json
[
  {
    "ip": "127.0.0.1",
    "port": "3001",
    "hostname": "localhost",
    "scheme": "http"
  }
]
EOF
dappy-lookup example A --network-file=network.json
```