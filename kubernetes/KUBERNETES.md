# Kubernetes

## General architecture

The common/base kubernetes settings are in `kubernetes/base/`, those are the general settings that do not change, whatever the dappy network or RChain network is. The base settings can be overwritten by those in `kubernetes/envs` that are namespace-specific and context-specific.

The specific configurations files are organized on a per-namespace basis, in the `kubernetes/envs/<CLOUD_PROVIDER>/` folder. We warmly invite you to duplicate this folder and create for example `kubernetes/envs/aws/` folder.

`kubernetes/envs/<CLOUD_PROVIDER>/` contains one folder per namespace. (see commands)

You may handle one, two or more dappy-node namespaces with this repository. An example:
- namespace 1 : **gamma**, connected to RChain testnet. Configuration files in `kubernetes/envs/<CLOUD_PROVIDER>/gamma`
- namespace 2 : **beta**, connected to RChain mainnet. Configuration files in `kubernetes/envs/<CLOUD_PROVIDER>/beta`
- namespace 3 : **d**, connected to RChain mainnet. Configuration files in `kubernetes/envs/<CLOUD_PROVIDER>/d` (main dappy name system not deployed yet)

Non production dappy-node infrastructure

![Dappy-node non production infrastructure](./docs/infrastructure.png)

## Deploy rnode

### Rnode public domain must be know by Rnode

Rnode endpoint must be publicly avaivable and have a domain name. To be executed, `rnode` needs to know its public domain (argument `--host`).  In scaleway we can recover the public domain name of the kubernetes nodes/virtual machines with a wget command, and store the value in `/var/lib/config/public-domain` text file.

You will have to change this so that it works with your cloud provider.

See `kubernetes/envs/<CLOUD_PROVIDER>/<NAMESPACE>/rnode/rnode-statefulset.yaml`.

### Generate rnode key and certificate

RNode needs to be exposed publicly, each rnode will have its own subdomain. When it starts, each rnode instance will generate a TLS certificate and key, so we don't have to generate the public TLS certificate and key for the blockchain network.

Nevertheless we need to generate a key pair for the dappy-node <-> rnode communication to be secure. `RNODE_PUBLIC_DOMAIN_NAME` is the public URL of your cluster or server.

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

kubectl create secret tls rnode-tls --key="rnode.key" --cert="rnode.crt" -n=<NAMESPACE>
```

```sh
kubectl apply -k kubernetes/envs/<CLOUD_PROVIDER>/<NAMESPACE>/rnode
```

## Deploy dappy-node 

### Static IP

A dappy node needs one static IP, get it from your cloud provider and reference it in `kubernetes/envs/scaleway/<NAMESPACE>/dappy/dappy-node-service.yaml .loadBalancerIP`. A fixed IP address matters for the (dappy-browser/internet <-> dappy-node) communication because it is a no-DNS communication.

Dappy is a no-DNS, encrypted only name system. We need to generate a certificate and key for secure browser to node communication. `DAPPY_NETWORK` may be `gamma`, `beta`, `d` or `local` for development.

### Generate dappy-node key and certificate

```sh
openssl req \
  -x509 \
  -newkey rsa:2048 \
  -sha256 \
  -days 3000 \
  -nodes \
  -keyout dappy-node.key \
  -out dappy-node.crt \
  -outform PEM \
  -subj '/CN=<DAPPY_NETWORK>'\
  -extensions san \
  -config <( \
    echo '[req]'; \
    echo 'distinguished_name=req'; \
    echo '[san]'; \
    echo 'subjectAltName=DNS.1:localhost,DNS.2:dappynode,DNS.3:<DAPPY_NODE_PUBLIC_DOMAIN_NAME>')

# save as a secret
kubectl create secret tls dappy-node-tls --key="dappy-node.key" --cert="dappy-node.crt" -n=<NAMESPACE>
```

### Deploy dappy-node kubernetes manifests

```sh
kubectl apply -k kubernetes/envs/scaleway/<NAMESPACE>/dappy
```
