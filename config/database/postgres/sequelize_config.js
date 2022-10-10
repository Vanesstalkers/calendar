const fs = require('node:fs');

let pg;
try {
  pg = JSON.parse(fs.readFileSync('./config/database/postgres/config.json').toString());
} catch (err) {}

const dialect = 'postgres';
const database = 'calendar';
module.exports = {
  development: pg?.development || {
    dialect,
    database,
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  },
  test: pg?.test || {
    dialect,
    database,
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  },
  production: pg?.production || {
    dialect,
    database,
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  },
};
