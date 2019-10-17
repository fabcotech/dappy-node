## dappy-node

This program exposes an API for Dappy users toi query, it includes:

- Gateways from websocket to grpc for listen-data-at-name, deploy and preview-private-names GRPC calls
- Redis database that maintains a dictionnary of all the names (domain names), with associated public keys and blockchain addresses

For now it is only exposed through web socket and not http.

### run without docker (development)

You have to have a RChain node running locally or remotely with GRPC api expôsed, and a redis server running also.

You must copy the .env.example file and name it .env so environment variables will be read from it.

```
git clone https://github.com/fabcotech/dappy-node.git
cd dapppy-node
npm install

node index
```

### run with docker (production)

The env variables ar read primarly from docker-compose, and then from .env file, docker-compose variables are
You must copy the .env.example file and name it .env so environment variables will be read from it.

RChain's rnode is not part of the docker-compose, it should be running on your machine (local or remote), with ports and IP matching the one described in docker-compose file.

```
# Build the image
docker-compose build

# Run the containers (redis and node JS script)
docker-compose up --abort-on-container-exit
```

dappy-node is plugged to the running rnode program !

Now you should be able to add `ws://127.0.0.1:3000` entry in your dappy blockchain interface, wait a bit and make sure the client connects.
