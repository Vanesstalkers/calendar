import * as fs from 'node:fs';

export function getConfig() {
  let pg, redis, mongo, greensms;
  try {
    if (!process.env.PGHOST) pg = JSON.parse(fs.readFileSync('./config/database/postgres/config.json').toString());
  } catch (err) {
    console.log('!!! FOR USE PG FILE-BASED CONFIG FILL /config/database/postgres/config.json');
    console.log('!!! OR SET env.PGHOST, env.PGUSER, env.PGPASSWORD');
  }
  try {
    if (!process.env.REDIS_HOST) redis = JSON.parse(fs.readFileSync('./config/storage/redis/config.json').toString());
  } catch (err) {
    console.log('!!! FOR USE REDIS FILE-BASED CONFIG FILL /config/storage/redis/config.json');
    console.log('!!! OR SET env.REDIS_HOST, env.REDIS_PORT');
  }
  try {
    if (!process.env.MONGO_URI) mongo = JSON.parse(fs.readFileSync('./config/database/mongo/config.json').toString());
  } catch (err) {
    console.log('!!! FOR USE MONGO FILE-BASED CONFIG FILL /config/database/mongo/config.json');
    console.log('!!! OR SET env.MONGO_URI');
  }
  try {
    if (!process.env.GREENSMS_URL)
      greensms = JSON.parse(fs.readFileSync('./config/service/sms/greensms.json').toString());
  } catch (err) {
    console.log('!!! FOR USE GREENSMS FILE-BASED CONFIG FILL /config/service/sms/greensms.json ');
    console.log('!!! OR SET env.GREENSMS_URL, env.GREENSMS_USER, env.GREENSMS_PASS');
  }
  console.log("process.env.MONGO_URI", process.env.MONGO_URI);
  return {
    pg: process.env.PGHOST
      ? {
          host: process.env.PGHOST,
          username: process.env.PGUSER,
          password: process.env.PGPASSWORD,
          database: process.env.PGDATABASE || 'calendar',
          dialect: 'postgres',
        }
      : process.env.MODE === 'PROD'
      ? pg?.production || {}
      : process.env.MODE === 'TEST'
      ? pg?.test || {}
      : pg?.development || {},
    redis: process.env.REDIS_HOST
      ? {
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT,
        }
      : process.env.MODE === 'PROD'
      ? redis?.production || {}
      : process.env.MODE === 'TEST'
      ? redis?.test || {}
      : redis?.development || {},
    mongo:
      process.env.MONGO_URI || process.env.MODE === 'PROD'
        ? mongo?.production
        : process.env.MODE === 'TEST'
        ? mongo?.test
        : mongo?.development,
    greensms: process.env.GREENSMS_URL
      ? {
          url: process.env.GREENSMS_URL,
          account: {
            user: process.env.GREENSMS_USER,
            pass: process.env.GREENSMS_PASS,
            from: 'Wazzup',
          },
        }
      : greensms,
  };
}
