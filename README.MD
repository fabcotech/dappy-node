## dappy-node

Simple node/express server to serve as a gateway between dappy and a RChain node.

### run

With a RChain node running locally or remotely with GRPC api:

```
git clone https://github.com/fabcotech/dappy-node.git
cd dapppy-node
npm install

// With default values --host localhost --port 40401 --express-port 3000
node index

// or with custom values
node index --host localhost --httpport 40403 --grpcport 40401 --express-port 4000
```
