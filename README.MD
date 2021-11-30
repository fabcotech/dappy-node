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

In production, dappy-node is ran with kubernetes, see `kubernetes/dappy.yml` . The kubernetes application uses 1 custom docker image: `dappy-node` (`DockerFile`). All the `.env` files are ignored and not part of the docker images, everything is in `kubernetes/dappy.yml` file.

### Build and push to docker hub

If your working on the dappy-node code, `src/`, follow the following to build and update image on docker hub.

```sh
# dappy-node (nodejs)
docker build . -f DockerfileNodejs -t fabcotech/dappy-node:0.1
docker push fabcotech/dappy-node:0.1

### Kubernetes stack

Have `kubectl` installed

The kubernetes stack includes 2 programs:

- `dappy-node` (`DockerfileNodejs`)
- `redis` (default redis docker image)

### create certificates and private keys

**dappy-node only uses self-signed certificates**

TLS/SSL security files `dhparams.pem` and `nginx/sslparams.conf` are generated following this link https://raymii.org/s/tutorials/Strong_SSL_Security_On_nginx.html

Certificates and private key. A given cluster deployment will use one `dappynode.crt` file and one `dappynode.key` file, they are only used by nginx and must be set as secretes with kubernetes.

```sh
openssl req \
  -x509 \
  -newkey rsa:2048 \
  -sha256 \
  -days 3000 \
  -nodes \
  -keyout dappynode.key \
  -out dappynode.crt \
  -outform PEM \
  -subj '/CN=dappynode' \
  -extensions san \
  -config <( \
    echo '[req]'; \
    echo 'distinguished_name=req'; \
    echo '[san]'; \
    echo 'subjectAltName=DNS.1:localhost,DNS.2:dappynode')
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

### Run dev/local environment on minikube (kubernetes)

#### Install and run minikube cluster

Be sure to have these tools installed:
- [NodeJS](https://nodejs.org/): Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine.
- [Git](https://git-scm.com/):  Open source distributed version control system
- [Docker](https://www.docker.com/get-started) : Docker CLI and container runtime
- [minikube](https://minikube.sigs.k8s.io/): CLI to create and manage local k8s clusters

```sh
# Start k8s cluster
minikube start

# Install ingress controller
minikube addons enable ingress
```

#### Deploy read only / observer rnode

Install [mkcert](https://github.com/FiloSottile/mkcert): It enables locally-trusted development certificates

```sh
# On macOS run following command in a dedicated terminal 
sudo minikube tunnel

cd <DAPPY_NODE_GIT_ROOT_FOLDER>/kubernetes/envs/minikube
# generate certificate for rnode HTTPS endpoint
mkcert rnode.dev

# Create secret sslsecret from certificate and key file
kubectl create secret tls sslsecret --key="rnode.dev-key.pem" --cert="rnode.dev.pem"

# Deploy rnode in devMode on minikube
kubectl apply -k rnode

# Add local entries to HOST file
sudo -s
echo "127.0.0.1    rnode.dev" >> /etc/hosts
exit

# Check HTTP and HTTPS endpoints
curl http://rnode.dev/status
curl https://rnode.dev/status
```

#### Deploy dappy-node 

Prerequisites to run dappy-node:
- Dappy name system master uri is needed and set to `RCHAIN_NAMES_MASTER_REGISTRY_URI` env variable.
- Dappy name system contract `dappynamesystem` must exists on local rnode network

To create master and deploy dappy name system contract on local rnode network, follow instructions below.

```sh
git clone git@github.com:fabcotech/rchain-token.git

cd rchain-token

npm install

cat << EOF > .env
READ_ONLY_HOST=http://rnode.dev
VALIDATOR_HOST=http://rnode.dev
PRIVATE_KEY=28a5c9ac133b4449ca38e9bdf7cacdce31079ef6b3ac2f0a080af83ecff98b36
EOF

# deploy master contract
node cli deploy-master

# create a box aaa
node cli deploy-box --box-id aaa

# Deploy name system contract dappynamesystem on box aaa
npm run dappy:namesystem
```

Contract is now deployed on your local rnode network, you can get its master URI from stdout, it is the `Master registry URI` value.
Save it, you will use master URI in next step, referenced as `MASTER_REGISTRY_URI`.

Inside folder `<DAPPY_NODE_GIT_ROOT_FOLDER>/kubernetes/envs/minikube`

```sh
# Create configmap that contains master uri
kubectl create configmap master-uri --from-literal=RCHAIN_NAMES_MASTER_REGISTRY_URI=<MASTER_REGISTRY_URI>

# Use minikube docker runtime
eval $(minikube docker-env)

# Build dappy-node image and push it into minikube docker runtime
docker build -t fabcotech/dappy-node -f DockerfileNodejs ../../.

# generate certificate for dappy-node HTTPS endpoint
mkcert dappy.dev

# Create secret sslsecret from certificate and key file
kubectl create secret tls dappy-node-tls --key="dappy.dev-key.pem" --cert="dappy.dev.pem"

# start or update config
kubectl apply -k dappy

# Add local entries to HOST file
sudo -s
echo "127.0.0.1    dappy.dev" >> /etc/hosts
exit

```

#### Other commands

```sh
# stop
kubectl delete -f dappy.local.yml

kubectl get pods
kubectl logs [pod name]

# Update dappy-node image and run it on kubernetes
cd <DAPPY_NODE_GIT_ROOT_FOLDER> 
eval $(minikube docker-env)
docker build -t fabcotech/dappy-node -f DockerfileNodejs .
kubectl rollout restart deployment dappy-jobs dappy-node

# update values in file stresstest/ping-pong.js
# and check ping/pong on http(3001) and https(3002)
node stresstest/ping-pong.js

```

#### Deploy an ip app

Prerequisites:
- [mkcert](https://github.com/FiloSottile/mkcert)
- [hosts](https://github.com/xwmx/hosts)

```sh
sudo hosts add 127.0.0.1 ipapp.dev
mkcert ipapp.dev
kubectl create secret tls ipapp-tls --key="ipapp.dev-key.pem" --cert="ipapp.dev.pem"
rm ipapp.dev-key.pem ipapp.dev.pem
kubectl apply -f kubernetes/envs/minikube/ipApp

curl -I https://ipapp.dev #should return HTTP code 200
```

### Run kubernetes (prod)
#### Generate read only / observer rnode certificate

Values required: 
- <RNODE_PUBLIC_DOMAIN_NAME>: RNode public domain name  (Example: `c9e619b7-cacc-4441-b75a-363dfde1b0fa.pub.instances.scw.cloud`)

```sh
openssl req \
  -x509 \
  -newkey rsa:2048 \
  -sha256 \
  -days 3000 \
  -nodes \
  -keyout rnode.key \
  -out rnode.crt \
  -outform PEM \
  -subj '/CN=rnode' \
  -extensions san \
  -config <( \
    echo '[req]'; \
    echo 'distinguished_name=req'; \
    echo '[san]'; \
    echo 'subjectAltName=DNS.1:localhost,DNS.2:rnode,DNS.3:<RNODE_PUBLIC_DOMAIN_NAME>')

kubectl create ns >CURRENT_NAMESPACE> # If namespace not exists
kubectl create secret tls rnode-tls --key="rnode.key" --cert="rnode.crt" -n=<CURRENT_NAMESPACE>
kubectl apply -k kubernetes/envs/scaleway/<CURRENT_K8S_ENV>/rnode

openssl req \
  -x509 \
  -newkey rsa:2048 \
  -sha256 \
  -days 3000 \
  -nodes \
  -keyout dappy-node.key \
  -out dappy-node.crt \
  -outform PEM \
  -subj '/CN=<DAPPY_COMMON_NAME>'\
  -extensions san \
  -config <( \
    echo '[req]'; \
    echo 'distinguished_name=req'; \
    echo '[san]'; \
    echo 'subjectAltName=DNS.1:localhost,DNS.2:dappynode,DNS.3:<DAPPY_NODE_PUBLIC_DOMAIN_NAME>')

kubectl create ns >CURRENT_NAMESPACE> # If namespace not exists
kubectl create secret tls dappy-node-tls --key="dappy-node.key" --cert="dappy-node.crt" -n=<CURRENT_NAMESPACE>
kubectl apply -k kubernetes/envs/scaleway/<CURRENT_K8S_ENV>/dappy
```

Check your `~/.kube/config` file, get one from gcloud / aws / scaleway etc..

**(1) static IP** You need to have one static IP, and reference it in `lb-dappy-node service .loadBalancerIP`. A fixed IP address only matters for the [dappy browser] -> [dappy node] communication that is no-DNS.

**(2) rnode** nodejs must know one `VALIDATOR` and one/many `READ_ONLY` (comma separated) read only nodes.

**(3) dappy-node** Set the `DAPPY_NETWORK` (dappy setting, ex: gammanetwork, dnetwork), `RCHAIN_NAMES_REGISTRY_URI` and `RCHAIN_NETWORK` in `kubernetes/dappy.yml nodejs .env`

**(4) nginx** Set the `DAPPY_NETWORK` (dappy setting), and `RCHAIN_NETWORK` in `kubernetes/dappy.yml nginx .env`

```sh
# start or update config
kubectl apply -f kubernetes/dappy.yml

# stop
kubectl delete -f kubernetes/dappy.yml

kubectl get pods
kubectl logs [pod name]
```
