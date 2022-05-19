#!/bin/bash

cat << EOF | docker compose -f /dev/stdin up
services:
  rnode:
    image: rchain/rnode:v0.13.0-alpha3
    volumes:
    - $PWD/.rnode:/var/lib/rnode
    ports:
    - 40403:40403
    - 40402:40402
    command: run -s --validator-private-key ${RNODE_PRIVATE_KEY:-28a5c9ac133b4449ca38e9bdf7cacdce31079ef6b3ac2f0a080af83ecff98b36} --dev-mode --shard-name dev
  rnode-propose:
    image: rchain/rnode:v0.13.0-alpha3
    links:
    - rnode
    entrypoint: 
    - sh
    - '-c'
    - 'while true; do /opt/docker/bin/rnode --grpc-port 40402 --grpc-host rnode propose; done'
  redis:
    image: redis:latest
    ports:
    - 6379:6379
EOF