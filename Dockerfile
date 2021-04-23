# copied from https://www.digitalocean.com/community/tutorials/how-to-build-a-node-js-application-with-docker

FROM node:10.24.1-alpine3.10

# needed for the package.json dependencies (rchain-token) that are on github and not on npm
RUN apk --update add git less openssh && \
    rm -rf /var/lib/apt/lists/* && \
    rm /var/cache/apk/*

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./
COPY src ./ 

USER node

RUN npm install

COPY --chown=node:node . .