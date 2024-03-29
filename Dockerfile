# copied from https://www.digitalocean.com/community/tutorials/how-to-build-a-node-js-application-with-docker

FROM node:17.5.0-alpine3.14

# needed for the package.json dependencies (rchain-token) that are on github and not on npm
RUN apk --no-cache add git less openssh && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

USER node

RUN mkdir ./logs
RUN mkdir ./www
COPY --chown=node:node package*.json ./
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src ./src/

RUN npm install && npm run build 

CMD ["node", "--max-old-space-size=8192", "dist/index.js"]