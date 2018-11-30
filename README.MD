## dappy-node

Simple node/express server to serve as a gateway between dappy and a RChain node.

### run

With a RChain node running locally or remotely with GRPC api:

```
git clone https://github.com/fabcotech/dappy-node.git
cd dapppy-node
npm install

node index

// or with custom arguments

node index --host http://localhost --port 50000 --expressport 4000
```
