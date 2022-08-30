/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.up = function up(knex) {
  return knex.schema.createTable('zones', (table) => {
    table.increments('id');
    table.string('domain', 255).notNullable();
    table.jsonb('zone').notNullable();
  });
};

exports.down = function down(knex) {};
