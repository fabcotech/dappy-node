# Installation outside of kubernetes

Prerequisites:
- [Git](https://git-scm.com/):  Open source distributed version control system
- [NodeJS](https://nodejs.org/): Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine.
- [Docker](https://www.docker.com/get-started) : Docker CLI and container runtime

## Rchain node

You need a RChain node running locally or remotely with regular API exposed ([rchain.coop/developer.html](https://rchain.coop/developer.html)), and a redis server running also. Generate certificates `.crt` and private key `.key` (see below).

Mandatory, to add transactions into blocks and propose them, this command need to be executed in another terminal
```sh
watch -n 3 rnode --grpc-port 40402 propose
```

## Redis

You can run a redis instance inside a container using this command:

```sh
docker run --name dappy-redis -d redis
```

To stop it, use this command:
```sh
docker stop dappy-redis
```

## Dappy-node

Grab dappy-node git repository

```sh
git clone https://github.com/fabcotech/dappy-node.git
cd dappy-node
```

### Setup dappy-node .env file

You must copy the values in any of the `.env.local.example` files, and rename it to `.env` so environment variables will be read. Of course you must also edit the `.env` variables so it fits with your rnode program and variables.

```sh
cp .env.local.example .env
```

In `.env` file, `RCHAIN_NAMES_MASTER_REGISTRY_URI=<MASTER_URI_TO_BE_DEFINED>` have to filled with a contract id of a dappy name system. 

You will deploy it in next steps on your rchain local node.

```sh
cat << EOF >> .env
VALIDATOR=http://localhost:40403
PRIVATE_KEY=28a5c9ac133b4449ca38e9bdf7cacdce31079ef6b3ac2f0a080af83ecff98b36
BOX_ID=nsbox1
CONTRACT_ID=nscontract1
EOF

npx new_name_system

```

Contract is now deployed on your local rnode network, you can get `Master registry URI` and `Contract id` values from stdout.

In `<DAPPY_NODE_FOLDER>/.env` file, replace:
- `<MASTER_URI_TO_BE_DEFINED>` with `Master registry URI` value. 
- `<CONTRACT_ID_TO_BE_DEFINED` with `Contract id` value

### Run dappy-node

In `<DAPPY_NODE_FOLDER>`, run these commands:
```sh
npm install
node --max-old-space-size=8192 src/index.js --ssl
```

**Note:** Of course set the 8192 value according to the capabilities of your server. See https://medium.com/@vuongtran/how-to-solve-process-out-of-memory-in-node-js-5f0de8f8464c.

# Installation inside a local kubernetes using minikube

## Install and run local kubernetes cluster

Be sure to have these tools installed:
- [NodeJS](https://nodejs.org/): Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine.
- [Git](https://git-scm.com/):  Open source distributed version control system
- [Docker](https://www.docker.com/get-started) : Docker CLI and container runtime
- [minikube](https://minikube.sigs.k8s.io/): CLI to create and manage local k8s clusters
- [kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl): CLI to manage kubernetes ressources

```sh
# Start k8s cluster
minikube start

# Install ingress controller
minikube addons enable ingress
```

## Deploy a rchain validator node in local kubernetes cluster

Install [mkcert](https://github.com/FiloSottile/mkcert): It enables locally-trusted development certificates. mkcert root CA must be installed with this command `mkcert -install` (chrome/firefox must be restarted)

```sh
# On macOS only, run following command in a dedicated terminal 
sudo minikube tunnel

cd <DAPPY_NODE_GIT_ROOT_FOLDER>/kubernetes/envs/minikube
# generate certificate for rnode HTTPS endpoint
mkcert rnode.dev

# Create secret sslsecret from certificate and key file
kubectl create secret tls sslsecret --key="rnode.dev-key.pem" --cert="rnode.dev.pem"

# Deploy rnode in devMode on minikube
kubectl apply -k rnode

# Wait until deployment is done
kubectl wait --for=condition=available --timeout=600s deployment/rnode

# For MacOs only, add local entries to HOST file 
sudo -s
echo "127.0.0.1    rnode.dev" >> /etc/hosts
exit

# For Linux only, add local entries to HOST file  
sudo -s
echo "`minikube ip`    rnode.dev" >> /etc/hosts
exit

# Check HTTP and HTTPS endpoints
curl http://rnode.dev/status
curl https://rnode.dev/status
```

## Deploy dappy-node 

Prerequisites to run dappy-node:
- Dappy name system master uri is needed and set to `RCHAIN_NAMES_MASTER_REGISTRY_URI` env variable.
- Dappy name system contract `dappynamesystem` must exists on local rnode network

To create master and deploy dappy name system contract on local rnode network, follow instructions below.

```sh
cat << EOF >> .env
VALIDATOR=http://localhost:40403
PRIVATE_KEY=28a5c9ac133b4449ca38e9bdf7cacdce31079ef6b3ac2f0a080af83ecff98b36
BOX_ID=nsbox1
CONTRACT_ID=nscontract1
EOF

npx new_name_system
```


Contract is now deployed on your local rnode network, you can get `Master registry URI` and `Contract id` values from stdout.

Save them, you will use them in next step, referenced as `MASTER_REGISTRY_URI` and `CONTRACT_ID`.

Inside folder `<DAPPY_NODE_GIT_ROOT_FOLDER>/kubernetes/envs/minikube`

```sh
# Create configmap that contains master uri
kubectl create configmap rnode-config --from-literal=RCHAIN_NAMES_MASTER_REGISTRY_URI=<MASTER_REGISTRY_URI> --from-literal=RCHAIN_NAMES_CONTRACT_ID=<CONTRACT_ID>

# Use minikube docker runtime
eval $(minikube docker-env)

# Build dappy-node image and push it into minikube docker runtime
docker build -t fabcotech/dappy-node -f ../../../DockerfileNodejs ../../../

# generate certificate for dappy-node HTTPS endpoint
mkcert dappy.dev

# Create secret sslsecret from certificate and key file
kubectl create secret tls dappy-node-tls --key="dappy.dev-key.pem" --cert="dappy.dev.pem"

# start or update config
kubectl apply -k dappy

# Wait until deployment is done
kubectl wait --for=condition=available --timeout=600s deployment/dappy-node

# For MacOs only, add local entries to HOST file 
sudo -s
echo "127.0.0.1    dappy.dev" >> /etc/hosts
exit

# For Linux only, add local entries to HOST file  
sudo -s
echo "`minikube ip`    dappy.dev" >> /etc/hosts
exit
```

## Redeploy Dappy name system

```sh

# Create new_name_system 
npx new_name_system

# Delete old configmap rnode-config
kubectl delete cm dappy-config

# <Grab and replace in next command MASTER_REGISTRY_URI> and <CONTRACT_ID> from stdout
# Create configmap that contains master uri
kubectl create configmap dappy-config --from-literal=RCHAIN_NAMES_MASTER_REGISTRY_URI=<MASTER_REGISTRY_URI> --from-literal=RCHAIN_NAMES_CONTRACT_ID=<CONTRACT_ID>

# start or update config
kubectl apply -k dappy

# Wait until deployment is done
kubectl wait --for=condition=available --timeout=600s deployment/dappy-node
```

## Docker build and push to docker hub

```sh
# dappy-node (nodejs)
docker build . -f DockerfileNodejs -t fabcotech/dappy-node:0.1
docker push fabcotech/dappy-node:0.1

# dappy-nginx (nginx)
docker build . -f DockerfileNginx -t fabcotech/dappy-nginx:0.1
docker push fabcotech/dappy-nginx:0.1
```

## Other commands

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

## Deploy an ip app

Prerequisites:
- [mkcert](https://github.com/FiloSottile/mkcert): It enables locally-trusted development certificates. mkcert root CA must be installed with this command `mkcert -install` (chrome/firefox must be restarted)
- [hosts](https://github.com/xwmx/hosts)

```sh
sudo hosts add 127.0.0.1 ipapp.dev
mkcert ipapp.dev
kubectl create secret tls ipapp-tls --key="ipapp.dev-key.pem" --cert="ipapp.dev.pem"
rm ipapp.dev-key.pem ipapp.dev.pem
kubectl apply -f kubernetes/envs/minikube/ipApp

curl -I https://ipapp.dev #should return HTTP code 200
```