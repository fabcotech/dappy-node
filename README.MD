## dappy-node

Simple node/express server to serve as a gateway between dappy and a RChain node.

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

You must copy the .env.example file and name it .env so environment variables will be read from it.

This docker-compose contains redis database and the node JS application

RNode is not part of the docker-compose, it should be running on your host machine, with ports matching the one described in .env file.

```
# Build the image
docker-compose build

# Run the containers (redis and node JS script)
docker-compose up --abort-on-container-exit
```

dappy-node is plugged to the running rnode program !

You can query it from dappy or your browser, check localhost:3000/version
