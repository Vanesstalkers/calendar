import * as pg from '../config/database/postgres/config.json';
import * as redis from '../config/storage/redis/config.json';
import * as greensms from '../config/service/sms/greensms.json';

export default {
  pg: pg.development,
  redis: redis,
  greensms: greensms,
};
