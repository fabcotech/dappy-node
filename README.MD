### dappy-node

dappy-node is a Node JS + Redis proxy + caching program, it sits between dappy browser and a RChain node, or a cluster of RChain nodes.

#### Quick start (dev)

You have to have a RChain node running locally or remotely with regular API exposed, and a redis server running also. Generate certificates `.crt` and private key `.key` (see below).

You must copy the values in any of the `.env.*.example` files, and rename it to `.env` so environment variables will be read. Of course you must also edit the `.env` variables so it fits with your rnode program and variables.

```
git clone https://github.com/fabcotech/dappy-node.git
cd dapppy-node
npm install

node --max-old-space-size=8192 src/index.js --ssl
```

**Note:** Of course set the 8192 value according to the capabilities of your server. See https://medium.com/@vuongtran/how-to-solve-process-out-of-memory-in-node-js-5f0de8f8464c.


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

### Program execution

#### Production

In production, dappy-node is ran with kubernetes, see `dappy-kubernetes.yml` . The kubernetes application uses two custom docker images:` dappy-nginx` (`DockerFileNginx`) and `dappy-node` (`DockerFile`). All the `.env` files are ignored and not part of the docker images, everything is in `dappy-kubernetes.yml` file.

#### Build and push to docker hub

If your working on the dappy-node code, `src/`, or dappy-nginx image, follow the following to build and update image on docker hub.

```
# dappy-node (nodejs)
docker build . -f DockerfileNodejs -t fabcotech/dappy-node:0.1
docker push fabcotech/dappy-node:0.1

# dappy-nginx (nginx)
docker build . -f DockerfileNginx -t fabcotech/dappy-nginx:0.1
docker push fabcotech/dappy-nginx:0.1
```

#### Kubernetes

Have `kubectl` installed

##### Kubernetes Stack

The kubernetes stack includes 4 programs:
- `nodejs` (`DockerfileNodejs`)
- `nginx` (`DockerfileNginx`)
- `redis` (default redis docker image)
- `rnode` (modified rnode image to work with no-tls no-encrypted traffic)

##### create certificates and private keys

**dappy-node only uses self-signed certificates**

TLS/SSL security files `dhparams.pem` and `nginx/sslparams.conf` are generated following this link https://raymii.org/s/tutorials/Strong_SSL_Security_On_nginx.html

Certificates and private key. A given cluster deployment will use one `dappynode.crt` file and one `dappynode.key` file, they are only used by nginx and must be set as secretes with kubernetes.

```
# just input US as country name and you can leave the rest blank
openssl req -x509 -nodes -days 3000 -newkey rsa:2048 -keyout dappynode.key -out dappynode.crt -outform PEM
```

**Warning**: `rnode.crt` and `rnode.key` can be obtained by running rnode locally, it will create a new key pair, `nginx` and `rnode` will use this keypair (see `dappy-kubernetes.yml`). When 1+ rnode instances will run in the same kubernetes stack, it is probable that a bug will occur because they will use same public key.

##### Set the secrets

```
base64 -w 0 rnode.crt
# outputs aabcbdbabbc...

base64 -w 0 rnode.key
# outputs cba56fdeadaed...

base64 -w 0 dappynode.crt
# outputs aabcbdbabbc...

base64 -w 0 dappynode.key
# outputs cba56fdeadaed...

# generate dhparams.pem
openssl dhparam -out dhparams.pem 4096

base64 -w 0 dhparams.pem
# outputs abb56fdeadaed...

cp sslsecret.example.yml sslsecret.yml

# Now replace the 5 values in sslsecret.yml with the base64 generated

# Create or update the secret in kubernetes
kubectl apply -f sslsecret.yml
```

##### Run kubernetes (dev)

```
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

##### Run kubernetes (prod)

Check your `~/.kube/config` file, get one from gcloud / aws / scaleway etc..

**(1) static IP** You need to have one static IP, and reference it in `nginx service .loadBalancerIP`, `rnode service` can have a new IP address when it is redeployed, for now rnode replicas will each have a subdomain like pod-abbcbabbdba.dappy.tech. A fixed IP address only matters for the [dappy browser] -> [dappy node] communication that is no-DNS.

**(2) rnode** Set the `CLUSTER_DOMAIN_NAME` (ex: dappy.tech), `BOOTSTRAP` (rnode setting), `NETWORK` (rnode setting), `SHARD_NAME` (rnode setting), `RCHAIN_NETWORK` in `dappy-kubernetes.yml rnode .env`. The domain name you set as `CLUSTER_DOMAIN_NAME` (example: dappy.tech) should point all the subdomains \*.dappy.tech to the public IP of the cluster.

**(3) nodejs** Set the `DAPPY_NETWORK` (dappy setting, ex: gammanetwork, dnetwork), `RCHAIN_NAMES_REGISTRY_URI` and `RCHAIN_NETWORK` in `dappy-kubernetes.yml nodejs .env`

**(4) nginx** Set the `DAPPY_NETWORK` (dappy setting), and again `RCHAIN_NETWORK` and `CLUSTER_DOMAIN_NAME` in `dappy-kubernetes.yml nginx .env`

```
# start or update config
kubectl apply -f dappy-kubernetes.yml

# stop
kubectl delete -f dappy-kubernetes.yml

kubectl get pods
kubectl logs [pod name]
```
