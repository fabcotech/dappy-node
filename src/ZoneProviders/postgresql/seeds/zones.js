/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('zones').del();
  await knex('zones').insert([
    {
      domain: 'example',
      zone: {
        origin: 'example',
        ttl: 3600,
        records: [
          {
            host: '@',
            type: 'TXT',
            value:
              'OWNER=04ea33c48dff95cdff4f4211780a5b151570a9a2fac5e62e5fa545c1aa5be3539c34d426b046f985204815964e10fcd1d87ef88d9bcf43816ad1fa00934cfe4652',
          },
        ],
      },
    },
  ]);
};
