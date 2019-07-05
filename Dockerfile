FROM node:9

WORKDIR /usr/src/app

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "node", "index" ]
