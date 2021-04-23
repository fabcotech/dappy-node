### dappy-node

dappy-node is a Node JS + Redis proxy + caching program, it sits between dappy browser and a RChain node, or a cluster of RChain nodes.

#### Quick start (dev)

In development you are supposed to work with a already running RChain's rnode software, one read-only and one validator node. See various `.env.x` files.

```
# With default certificate (dev only)
node src/index --ssl
```

####

#### HTTPS/HTTP exposition

This program must be accessible through HTTP/TLS and also regular HTTP traffic.

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

You must copy the `.env.testnet` file, rename it to `.env` so environment variables will be read from it. Of course you must also edit the `.env` variables so it fits with your rnode program and variables.

**Note :** values in `.env.example` are kept up to date do dappy-node can start on a valid Dappy network connected to RChain's testnet.

`DAPPY_NETWORK` is read by Dappy browser, to know what is the name of the Dappy network, currently it is probably betanetwork or deltanetwork.

`RCHAIN_NETWORK` is also read by Dappy browser, it is important that user know if the Dappy network is connected to mainnet, testnet, or another local network.

`RCHAIN_NAMES_REGISTRY_URI` : Registry URI of the records stored on the blockchain. It is the address of a NFT contract deployed with [rchain-token](https://github.com/fabcotech/rchain-token) repo.

```
git clone https://github.com/fabcotech/dappy-node.git
cd dapppy-node
npm install

node src/index.js node --max-old-space-size=8192 src/index.js --ssl
```

**Note:** Of course set the 8192 value according to the capabilities of your server. See https://medium.com/@vuongtran/how-to-solve-process-out-of-memory-in-node-js-5f0de8f8464c.

#### Production

In production, dappy-node is ran with kubernetes, see `dappy-kubernetes.yml` . The kubernetes application uses two custom docker images:` dappy-nginx` (`DockerFileNginx`) and `dappy-node` (`DockerFile`). All the `.env` files are ignored and not part of the docker images, everything is in `dappy-kubernetes.yml` file.

#### Build and push to docker hub

If your working on the dappy-node code, `src/`, or dappy-nginx image, follow the following to build and update image on dockeer hub.

```
# dappy-node image
docker build . -t fabcotech/dappy-node:0.1
docker push fabcotech/dappy-node:0.1

docker build . -f DockerfileNginx -t fabcotech/dappy-nginx:0.1
docker push fabcotech/dappy-nginx:0.1
```

#### Kubernetes

Have `kubectl` installed

**dappy-node only uses self-signed certificates**

TLS/SSL security files `dhparams.pem` and `sslparams.conf` are generated following this link https://raymii.org/s/tutorials/Strong_SSL_Security_On_nginx.html

Certificates and private key. A given cluster deployment will use one .crt and one .key file, they are only used by nginx and must be set as secretes with kubernetes. Let's say you have `nginx.crt` file and `nginx.key` file.

##### Set the secrets

```
base64 -w 0 nginx.crt
# outputs aabcbdbabbc...

base64 -w 0 nginx.key
# outputs cba56fdeadaed...

# generate dhparams.pem
openssl dhparam -out dhparams.pem 4096

base64 -w 0 dhparams.pem
# outputs abb56fdeadaed...

# cp sslsecret.example.yml sslsecret.yml
# replace the 3 values in sslsecret.yml with the base64 generated

# Create the secret in kubernetes
kubectl apply -f sslsecret.yml
```

##### Run kubernetes

##### dev

```
minikube start

# start or update config
kubectl apply -f dappy-kubernetes.yml

# stop
kubectl delete -f dappy-kubernetes.yml

kubectl get pods
kubectl logs [pod name]
```
