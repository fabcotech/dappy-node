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

# dappy-node (nodeJS) ports
sudo ufw allow 443
sudo ufw allow 80

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
sudo apt -y update && sudo apt -y upgrade
curl -sL https://deb.nodesource.com/setup_17.x | sudo bash -
sudo apt-get install -y nodejs npm
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

# run in the background with nohup
nohup rnode run --bootstrap $BOOTSTRAP --network-id $RCHAIN_NETWORK --shard-name $SHARD_NAME --host $RNODE_PUBLIC_DOMAIN_NAME --protocol-port '40400' --discovery-port '40404' --api-port-grpc-external '40401' --api-port-http '40403' --finalization-rate '1' --max-number-of-parents '1' --fault-tolerance-threshold '-1' --synchrony-constraint-threshold '0.99' --fork-choice-stale-threshold '60 minutes'

ctrl+z
bg

# check that process runs in the background
tail -f ~/.rnode/rnode.log
```

Instantly `$RNODE_PUBLIC_DOMAIN_NAME:40403/status` should output the version. When Last Finalized State is reached (few hours after launch on testnet) `$RNODE_PUBLIC_DOMAIN_NAME:40403/api/blocks/1` should give information about the most recent block.

### Run dappy node

Rnode HTTP API is succesfully running at `$RNODE_PUBLIC_DOMAIN_NAME:40403` and `localhost:40403`. Now we must run dappy-node nodeJS program and expose it on port 443.

Dappy node is not exposed through DNS, but directly with IP address.

```
# generate the certificates for dappy-node
openssl req \
  -x509 \
  -newkey rsa:2048 \
  -sha256 \
  -days 3000 \
  -nodes \
  -keyout dappynode.key \
  -out dappynode.crt \
  -outform PEM \
  -subj '/CN=<DAPPY_NETWORK>'\
  -extensions san \
  -config <( \
    echo '[req]'; \
    echo 'distinguished_name=req'; \
    echo '[san]'; \
    echo 'subjectAltName=DNS.1:localhost,DNS.2:dappynode')

git clone https://github.com/fabcotech/dappy-node.git
cd dappy-node
npm install
```

Configure dappy-node `.env` file.

```
REDIS_SERVICE_HOST=127.0.0.1
REDIS_DB=1
HTTP_PORT=80
HTTPS_PORT=443

CACHING=30
READ_ONLY=http://localhost:40403

# Make sure it is a valid validator
VALIDATOR=https://node0.testnet.rchain.coop

# Make sure the six following values are accurate
# with the network you want to plug into
RCHAIN_NAMES_MASTER_REGISTRY_URI=iwusrr5g6zdywzh4mg5jydb5p3dh4edonz39jp33cb9eqi4zbehzs4
RCHAIN_NAMES_CONTRACT_ID=iuwdappynamesystem

DAPPY_NETWORK=gamma
RCHAIN_NETWORK=testnet220210
DAPPY_BROWSER_MIN_VERSION=0.5.4
DAPPY_BROWSER_DOWNLOAD_LINK=https://github.com/fabcotech/dappy/releases/tag/0.5.4?warning
```

The dappy-node program will use `dappynode.crt` and `dappynode.key` for the port 443. And nothing for port 80.

```
# run dappy-node
node src/index.js

# check that you have logs that look like the following
2022-02-24T09:59:55.149Z RChain node responding at http://localhost:40403/version and /api/blocks/1
2022-02-24T09:59:55.150Z Listening for HTTP on address 127.0.0.1:80 !
2022-02-24T09:59:55.155Z Listening for HTTP+TLS on address 127.0.0.1:443 ! (TLS handled by nodeJS)
2022-02-24T09:59:55.365Z Finalized block height : 120 (base 12 rounding) REVs

# you can now run in the background and close session
node src/index.js &
ctrl+z
bg
```

Check that your dappy node is running by openning `[dappy-node public IP address]:80/monitor` in your browser.

You can now communicate the IP address, certificate to the team or admin managing the dappy network.