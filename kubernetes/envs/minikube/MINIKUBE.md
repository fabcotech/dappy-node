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
- Dappy name system master uri is needed and set to `DAPPY_NAMES_MASTER_REGISTRY_URI` env variable.

To create master and deploy dappy name system contract on local rnode network, follow instructions below.

```sh
npm i -g @fabcotech/dappy-node
dappy-deploy-name-system --validator=http://rnode.dev
```

Contract is now deployed on your local rnode network, you can get `DAPPY_NAMES_MASTER_REGISTRY_URI` and `DAPPY_NAMES_CONTRACT_ID` values from `dappyrc` file.

Inside folder `<DAPPY_NODE_GIT_ROOT_FOLDER>/kubernetes/envs/minikube`

```sh
# Create configmap that contains master uri
kubectl create configmap dappy-config --from-env-file dappyrc

# Use minikube docker runtime
eval $(minikube docker-env)

# Build dappy-node image and push it into minikube docker runtime
docker build -t fabcotech/dappy-node -f ../../../ ../../../

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

# Create deploy_name_contract 
npm i -g @fabcotech/dappy-node
dappy-deploy-name-system --validator=http://rnode.dev

# Delete old configmap rnode-config
kubectl delete cm dappy-config

# Create configmap that contains master uri
kubectl create configmap dappy-config --from-env-file dappyrc

# start or update config
kubectl apply -k dappy

# Wait until deployment is done
kubectl wait --for=condition=available --timeout=600s deployment/dappy-node
```

## Docker build and push to docker hub

```sh
# dappy-node (nodejs)
docker build . -t fabcotech/dappy-node:{DAPPY_NODE_VERSION}
docker push fabcotech/dappy-node:{DAPPY_NODE_VERSION}
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
docker build -t fabcotech/dappy-node .
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