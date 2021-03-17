### dappy-node

This program exposes an API for Dappy users to query, it includes:

- Gateways from websocket to grpc for listen-data-at-name, deploy and preview-private-names GRPC calls
- Redis database that maintains a dictionnary of all the names (domain names), with associated public keys and blockchain addresses

For now it is only exposed through web socket and not http.

#### Quick start (dev)

```
# With default certificate (dev only)
node src/index --ssl
```

#### HTTPS/HTTP exposition

This program must be accessible through HTTP/TLS and also regular HTTP traffic. In your nginx/apache config you must redirect TLS traffic (port 443) to the `HTTPS_PORT` port, and regular HTTP traffic (port 80) to the `HTTP_PORT` port.

List of the methods exposed for each kind of traffic :

**Encrypted HTTP/TLS** (only websocket) :

- `info` : General node version number and information
- `get-nodes?network=NETWORK_NAME` : Get the nodes powering this network (expressend in rholang AST format)
- `get-all-records` : Get all the name records
- `deploy` : Deploy a rholang term
- `listen-for-data-at-name` : Get unforgeable name value on the blockchain
- `listen-for-data-at-name-x` : Get multiple unforgeable names value on the blockchain
- `preview-private-names` : predict the unforgeable name (unforgeable name) id for a given public key / timestamp.

**Unencrypted HTTP** (regular HTTP GET requests):

- `/info` : General node version number and information
- `/get-nodes?network=NETWORK_NAME` : Get the nodes powering this network (expressed in rholang AST format)

#### Certificate generation (development)

Dappy does not use certificate authorities, TLS encryption certificates are stored on the blockchain with the actual name (ex: _google_, _nytimes_ etc). Therefore, it is more logical that they are self signed and not issued by a trusted third party.

https://www.digitalocean.com/community/tutorials/how-to-create-a-self-signed-ssl-certificate-for-nginx-in-ubuntu-16-04

The following lines will explain how to set a self signed certificate, so clients (Dappy browsers) will connect securely to dappy node. Dappy browser refuses non-encrypted traffic so you have to do it even if in development mode.

Generate private key and certificate with the following command (replace very carefully the -subj parameters your data, and particularly the CN attribute that must match fake domain name (if dev) or real domain name).

C = country code
ST = state
L = location
0 = organization
CN = Common name (the one that is important)

```
openssl req -x509 -days 365 -nodes -sha256 -newkey rsa:2048 -subj "/C=FR/CN=localhost/O=MyCompany" -keyout server-key.pem -out server-crt.pem
```

Two files should be generated, a `server-key.pem` file and a `server-crt.pem` file.

!!! NEVER SHARE THE server-key.pem FILE WITH ANYONE, IT SHOULD STAY ON YOUR SERVER !!!

### Program execution

#### Environment variables

You have to have a RChain node running locally or remotely with regular API exposed, and a redis server running also.

You must copy the `.env.example` file, name it `.env` so environment variables will be read from it. Of course you must also edit the `.env` variables so it fits with your rnode program and variables.

**Note :** values in `.env.example` are kept up to date do dappy-node can start on a valid Dappy network connected to RChain's testnet.

`DAPPY_NETWORK` is read by Dappy browser, to know what is the name of the Dappy network, currently it is probably betanetwork or deltanetwork.

`RCHAIN_NETWORK` is also read by Dappy browser, it is important that user know if the Dappy network is connected to mainnet, testnet, or another local network.

`RCHAIN_NAMES_REGISTRY_URI` : Registry URI of the records stored on the blockchain. (uploaded with [rchain-names](https://github.com/fabcotech/rchain-names) repo)

`RCHAIN_NODES_REGISTRY_URI` : Registry URI of the nodes / network members stored on the blockchain. (uploaded with [rchain-names](https://github.com/fabcotech/rchain-names) repo)

```
git clone https://github.com/fabcotech/dappy-node.git
cd dapppy-node
npm install

node src/index.js node --max-old-space-size=8192 src/index.js --ssl
# or with pm2 (fine for production)
pm2 start ecosystem.config.js  --node-args="--max-old-space-size=8192"
```

**Note:** Of course set the 8192 value according to the capabilities of your server. See https://medium.com/@vuongtran/how-to-solve-process-out-of-memory-in-node-js-5f0de8f8464c.

#### Production

The environment variables are read primarly from `docker-compose.yml`, and then from `.env` file. We advise you to set the ports/IP/network related variables must be set in the `docker-compose.yml`, and the RChain related variables in `.env` file.

Copy the `.env.example` file, name it `.env` and update the variables in it (you can remove the ones that are already in `docker-compose.yml` for clarity).

**important (1)** : Check that the IP address of the gateway between the Docker host and the bridge network is 172.17.0.1. If not, change it in `docker-compose.yml`. Check this page https://docs.docker.com/network/network-tutorial-standalone/.

**important (2)** : if you node can create block (has stake participation) you will reference only one node in the VALIDATOR\_\* and READ_ONLY\_\*, if your node is read only you must reference a node (validator) to which the deploys will be sent.

RChain's rnode is not part of the docker-compose, it should be running on your machine (local or remote), with ports and IP matching the one described in `docker-compose.yml` file.

**Important (3)** : we advise you not to handle TLS in the docker / nodeJS application. In your nginx/apache config you must redirect TLS traffic (port 443) to the `HTTPS_PORT` port, and regular HTTP traffic to the `HTTP_PORT` port. You should not use CA related certificate, but rather generate a self signed certificate. Then it must be uploaded to the blockchain. See [rchain-names](https://github.com/fabcotech/rchain-names) .

**Important (4)** : Check the `--max-old-space-size` in the node start script. See https://medium.com/@vuongtran/how-to-solve-process-out-of-memory-in-node-js-5f0de8f8464c.

```
git clone https://github.com/fabcotech/dappy-node.git
cd dapppy-node

# Update .env and docker-compose.yml variables

# Build the image
docker-compose build

# Run the containers (redis and node JS script)
docker-compose up --abort-on-container-exit
```

dappy-node is plugged to the running rnode program !

#### Development

##### With node JS directly

```
node src/index --ssl
```

##### With docker

If you use dappy-node for development purpose, you can let docker / node JS handle the encryption/TLS. Go to the `docker-compose` file and add the `--ssl` parameter to the `command` line :

`command: sh -c 'npm i && node --max-old-space-size=8192 src/index.js --ssl'`

Node JS will try to read the `server-crt.pem` (certificate) and `server-key.pem` (private key). You can run the program with those commands:

```
docker-compose build
docker-compose up --abort-on-container-exit
```

If you encounter any bug, please create an issue, or report it on the chat group. https://discord.gg/8Cu5UFV
