import * as pg from '../config/database/postgres/config.json';
import * as redis from '../config/storage/redis/config.json';
import * as greensms from '../config/service/sms/greensms.json';

export default {
  pg: process.env.PG_HOST
    ? {
        host: process.env.PG_HOST,
        username: process.env.PG_USER,
        password: process.env.PG_PASS,
        database: 'calendar',
        dialect: 'postgres',
      }
    : pg.development,
  redis: process.env.REDIS_HOST
    ? {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
      }
    : redis,
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
