# Dappy node (running in OS)

This guide focuses on running the softwares necessary to run an observer rnode (RChain) + dappy node directly on the OS (no docker, no kubernetes).

You must have a valid URL pointing to your server to start with. This tutorial has been written and tested with ubuntu server OS.

Know the RChain network you want to connect to first:
- `RCHAIN_NETWORK`: See README.MD
- `SHARD_NAME`: See README.MD
- `BOOTSTRAP`: See README.MD
- `RNODE_PUBLIC_DOMAIN_NAME`: See README.MD

Know the variables of the dappy network too:
- `DAPPY_NETWORK`: See README.MD
- `DAPPY_NODE_PUBLIC_DOMAIN_NAME`: identifier of your node in the dappy network (no DNS), for example `fabcogamma`
- `RCHAIN_NAMES_MASTER_REGISTRY_URI`: See README.MD
- `RCHAIN_NAMES_CONTRACT_ID`: See README.MD
- `CONTRACTS`: See README.MD

### Prequisites

Have a $USER who is part of sudo group. This tutorial has been written on ubuntu server 20.04.

### Open ports

```
# rnode ports
sudo ufw allow 40400
sudo ufw allow 40401
sudo ufw allow 40403
sudo ufw allow 40404

# nginx ports
sudo ufw allow 443

sudo ufw enable

# check open ports
sudo ufw status
```

### Install dependencies

**Esential and git**

```
sudo apt update
sudo apt install build-essential git
```

**Java Open JDK**

```
sudo apt update
sudo apt install default-jdk
# check version, you must at least version 11
java -version
```

**Node JS**

```
sudo apt update
sudo apt install nodejs
# check version
node --version
```

**Redis**

```
sudo apt update
sudo apt install redis-server

# check version
redis-server --version

sudo vi /etc/redis/redis.conf

# find a line that starts with "supervised" and replace by the following:
supervised systemd

# start service
sudo systemctl restart redis.service

# check that it is running on 127.0.0.1:6379
sudo systemctl status redis
```

**nginx**

```
sudo apt update
sudo apt install nginx
```

### Run rnode


```
# make sure this is the release you need for
# the network your want to connect to
# https://github.com/rchain/rchain/releases/

# example with 0.12.4
wget https://github.com/rchain/rchain/releases/download/v0.12.4/rnode_0.12.4_all.deb

sudo apt install ./rnode_0.12.4_all.deb

# run rnode, replace $BOOTSTRAP $RCHAIN_NETWORK, $SHARD_NAME and
# $RNODE_PUBLIC_DOMAIN_NAME and with single quotes, example --bootstrap 'rnode://xxx'

rnode run --bootstrap $BOOTSTRAP --network-id $RCHAIN_NETWORK --shard-name $SHARD_NAME --host $RNODE_PUBLIC_DOMAIN_NAME --protocol-port '40400' --discovery-port '40404' --api-port-grpc-external '40401' --api-port-http '40403' --finalization-rate '1' --max-number-of-parents '1' --fault-tolerance-threshold '-1' --synchrony-constraint-threshold '0.99' --fork-choice-stale-threshold '60 minutes' &
```

### Run dappy node

```
# generate the certificates for dappy-node
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

git clone https://github.com/fabcotech/dappy-node.git
```

