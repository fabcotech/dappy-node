/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  client: 'pg',
  migrations: {
    directory: './migrations',
  },
  connection:
    process.env.DAPPY_PG_CONNECTION_STRING ||
    'postgresql://postgres:postgres@localhost:5432/dappy',
};
