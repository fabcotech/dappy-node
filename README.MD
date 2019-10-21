## dappy-node

This program exposes an API for Dappy users to query, it includes:

- Gateways from websocket to grpc for listen-data-at-name, deploy and preview-private-names GRPC calls
- Redis database that maintains a dictionnary of all the names (domain names), with associated public keys and blockchain addresses

For now it is only exposed through web socket and not http.

### HTTPS/HTTP exposition

This program must be accessible through encrypted/SSL and also regular HTTP traffic. In your nginx/apache config you must redirect SSL traffic (port 443) to the `HTTPS_PORT` port, and regular HTTP traffic to the `HTTP_PORT` port.

List of the methods for each kind of traffic :

Encrypted/SSL (only websocket) :

- info : General node version number and information
- get-nodes?network=NETWORK_NAME : Get the nodes powering this network (expressend in rholang AST format)
- get-all-records" : Get all the name records
- deploy : Deploy a rholang term
- listen-for-data-at-name : Listen for a name on the blockchain
- listen-for-data-at-name-x : Listen for multiple names on the blockchain
- preview-private-names : predict the private name (unforgeable name) value for a given public key / timestamp.

Unencrypted/HTTP (regular HTTP GET requests):

- /info : General node version number and information
- /get-nodes?network=NETWORK_NAME : Get the nodes powering this network (expressend in rholang AST format)

### Certificate generation / SSL setup

#### hosts file edition (development)

If you are in a development environment, or testing on your local machine and you want to make sure that SSL connection between Dappy browser and dappy-node works, you must add an entry in your hosts file, and choose a fake domain name. This is because Dappy will refuse to establish SSL connection with an IP host.

If you are on a remote server that is identified with a domain name, skip the hosts file edition step.

For example, add the following line in your hosts file (`/etc/hosts` on linux/osx) (`C:\WINDOWS\system32\drivers\etc\hosts` on windows) :

```
127.0.0.1       localdappynode.com
```

When Dappy browser will try to reach `localdappynode.com:3000`, it will be redirected to this dappy-node program.

### Environment variables

Wether you run with or without docker, you must setup some RChain related env variables :

- `RCHAIN_NAMES_UNFORGEABLE_NAME_ID` : Unforgeable name ID of the records on chain . (uploaded with [rchain-names](https://github.com/fabcotech/rchain-names) repo)
- `RCHAIN_NAMES_REGISTRY_URI` : Registry URI of the records on chain . (uploaded with [rchain-names](https://github.com/fabcotech/rchain-names) repo)
- `DAPPY_NODES_UNFORGEABLE_NAME_ID`: Unforgeable name ID of the Dappy nodes on chain . (uploaded with [rchain-names](https://github.com/fabcotech/rchain-names) repo)

### Run without docker (development)

##### Certificate generation (development)

The following lines will explain how to set a self-signed certificate, so clients (Dappy browsers) will connect securely to dappy nodes.

Very simple, generate private key and certificate with the following command (replace very carefully the -subj parameters your data, and particularly the CN attribute that must match fake domain name (if dev) or real domain name).

C = country code
ST = state
L = location
0 = organization
CN = Common name (the one that is important)

```
openssl req -x509 -days 365 -nodes -sha256 -newkey rsa:2048 -subj "/C=FR/CN=localdappynode.com/O=MyCompany" -keyout server-key.pem -out server-crt.pem
```

Two files should be generated, a `server-key.pem` file and a `server-crt.pem` file.

!!! NEVER SHARE THE server-key.pem FILE WITH ANYONE, IT SHOULD STAY ON YOUR SERVER !!!

##### Program execution

You have to have a RChain node running locally or remotely with GRPC api exposed, and a redis server running also.

You must copy the .env.example file, name it .env so environment variables will be read from it. Of course you must also edit the .env variables so it fits with your rnode program and variables.

```
git clone https://github.com/fabcotech/dappy-node.git
cd dapppy-node
npm install

node index --ssl
```

### run with docker (production)

The environment variables are read primarly from docker-compose, and then from .env file. The port/IP related variables must be set in the `docker-compose`, the RChain related variables can be set only in the `.env` file.

You must copy the .env.example file and name it .env so environment variables will be read from it.

RChain's rnode is not part of the docker-compose, it should be running on your machine (local or remote), with ports and IP matching the one described in docker-compose file.

**Important** : the docker does not handle SSL. In your nginx/apache config you must redirect SSL traffic (port 443) to the `HTTPS_PORT` port, and regular HTTP traffic to the `HTTP_PORT` port. You must not use CA related certificate. But generate a self-signed certificate. Then it must be uploaded to the blockchain. See [rchain-names](https://github.com/fabcotech/rchain-names) .

```
git clone https://github.com/fabcotech/dappy-node.git
cd dapppy-node

# Build the image
docker-compose build

# Run the containers (redis and node JS script)
docker-compose up --abort-on-container-exit
```

dappy-node is plugged to the running rnode program !

Now you should be able to add `wss://localdappynode.com:3000` entry in your dappy blockchain interface, wait a bit and make sure the client connects.
