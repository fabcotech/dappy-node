## dappy-node

Simple node/express server to serve as a gateway between dappy and a RChain node.

### run

With a RChain node running locally or remotely with GRPC api:

```
git clone https://github.com/fabcotech/dappy-node.git
cd dapppy-node
npm install

// With default values --host localhost --port 40401 --express-port 3000
node index

// or with custom values
node index --host localhost --httpport 40403 --grpcport 40401 --express-port 4000
```

With docker

```
# Build the image
docker build -t "dappy-node" .

# Run the image
docker run --network="host" -p RNODE_HTTP_PORT:40403 -p RNODE_GRPC_PORT:40401 -p HOST_DAPPY_NODE_PORT:3000 -d dappy-node

# For a rnode default configuration

# Run
docker run --network="host" -p 40403:40403 -p 40401:40401 -p 3000:3000 dappy-node

# Run in detach mode
docker run --network="host" -p 40403:40403 -p 40401:40401 -p 3000:3000 -d dappy-node

```

dappy-node is plugged to the running rnode program !

You can query it from dappy or your browser, check localhost:3000/version
