# Dappy node

Kubernetes stack that each dappy network member must run. Inludes a quick start (dev) setup, and a production k8s stack that includes 4 programs.

## Quick start (dev)

You have to have a RChain node running locally or remotely with regular API exposed ([rchain.coop/developer.html](https://rchain.coop/developer.html)), and a redis server running also. Generate certificates `.crt` and private key `.key` (see below).

You must copy the values in any of the `.env.*.example` files, and rename it to `.env` so environment variables will be read. Of course you must also edit the `.env` variables so it fits with your rnode program and variables.

```sh
git clone https://github.com/fabcotech/dappy-node.git
cd dapppy-node
npm install

node --max-old-space-size=8192 src/index.js --ssl
```

**Note:** Of course set the 8192 value according to the capabilities of your server. See https://medium.com/@vuongtran/how-to-solve-process-out-of-memory-in-node-js-5f0de8f8464c.

## HTTPS/HTTP exposition

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

## Production

In production, dappy-node is ran with kubernetes, see `dappy-kubernetes.yml` . The kubernetes application uses two custom docker images:` dappy-nginx` (`DockerFileNginx`) and `dappy-node` (`DockerFile`). All the `.env` files are ignored and not part of the docker images, everything is in `dappy-kubernetes.yml` file.

### Build and push to docker hub

If your working on the dappy-node code, `src/`, or dappy-nginx image, follow the following to build and update image on docker hub.

```sh
# dappy-node (nodejs)
docker build . -f DockerfileNodejs -t fabcotech/dappy-node:0.1
docker push fabcotech/dappy-node:0.1

# dappy-nginx (nginx)
docker build . -f DockerfileNginx -t fabcotech/dappy-nginx:0.1
docker push fabcotech/dappy-nginx:0.1
```

### Kubernetes stack

Have `kubectl` installed

The kubernetes stack includes 4 programs:

- `nodejs` (`DockerfileNodejs`)
- `nginx` (`DockerfileNginx`)
- `redis` (default redis docker image)

### create certificates and private keys

**dappy-node only uses self-signed certificates**

TLS/SSL security files `dhparams.pem` and `nginx/sslparams.conf` are generated following this link https://raymii.org/s/tutorials/Strong_SSL_Security_On_nginx.html

Certificates and private key. A given cluster deployment will use one `dappynode.crt` file and one `dappynode.key` file, they are only used by nginx and must be set as secretes with kubernetes.

```
# just input US as country name and you can leave the rest blank
openssl req -x509 -nodes -days 3000 -newkey rsa:2048 -keyout dappynode.key -out dappynode.crt -outform PEM
```

### Set the secrets

```sh
base64 -w 0 dappynode.crt
# outputs aabcbdbabbc...

base64 -w 0 dappynode.key
# outputs cba56fdeadaed...

# generate dhparams.pem
openssl dhparam -out dhparams.pem 4096

base64 -w 0 dhparams.pem
# outputs abb56fdeadaed...

cp sslsecret.example.yml sslsecret.yml

# Now replace the 3 values in sslsecret.yml with the base64 generated

# Create or update the secret in kubernetes
kubectl apply -f sslsecret.yml
```

### Run kubernetes (dev)

```sh
minikube start

# start or update config
kubectl apply -f dappy-kubernetes.yml

# stop
kubectl delete -f dappy-kubernetes.yml

kubectl get pods
kubectl logs [pod name]

# update values in file stresstest/ping-pong.js
# and check ping/pong on http(3001) and https(3002)
node stresstest/ping-pong.js

```

### Run kubernetes (prod)

Check your `~/.kube/config` file, get one from gcloud / aws / scaleway etc..

**(1) static IP** You need to have one static IP, and reference it in `nginx service .loadBalancerIP`. A fixed IP address only matters for the [dappy browser] -> [dappy node] communication that is no-DNS.

**(2) rnode** nodejs must know one `VALIDATOR` and one/many `RNODEHTTP_SERVICE_HOST` (comma separated) read only nodes.

**(3) nodejs** Set the `DAPPY_NETWORK` (dappy setting, ex: gammanetwork, dnetwork), `RCHAIN_NAMES_REGISTRY_URI` and `RCHAIN_NETWORK` in `dappy-kubernetes.yml nodejs .env`

**(4) nginx** Set the `DAPPY_NETWORK` (dappy setting), and `RCHAIN_NETWORK` in `dappy-kubernetes.yml nginx .env`

```sh
# start or update config
kubectl apply -f dappy-kubernetes.yml

# stop
kubectl delete -f dappy-kubernetes.yml

kubectl get pods
kubectl logs [pod name]
```
