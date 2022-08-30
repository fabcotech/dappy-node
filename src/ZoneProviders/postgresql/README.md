# Postgresql zone provider

## Environment variables

| **Keys** | **Required** | **Default value (dev)** | **Description** |
|---|---|---|---|
| DAPPY_PG_CONNECTION_STRING | No | `postgresql://postgres:postgres@localhost:5432/dappy` | postgresql connection string |

## Use it locally

Start a postgresql instance locally:
```sh
npm run pg:start
```

Deploy dappy tables:
```sh
npm run pg:migrate
```

Deploy seed data (useful data for tests):
```sh
npm run pg:seed
```

Run dappy-node using postgresql zone provider
```sh
npm run start:dev:postgresql
```

Open adminer to inspect pg data
```sh
npm run pg:open-adminer
```