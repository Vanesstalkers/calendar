import { DataSource } from 'typeorm';
import config from './config';

// если начнутся проблемы с миграциями, то нужно поискать решение тут: https://github.com/typeorm/typeorm/issues/3137
const myDataSource = new DataSource({
  ...config.pg,
  type: 'postgres',
  entities: ['dist/src/entity/*{ .ts,.js}'],
  migrations: ['migrations/*{.ts,.js}'],
});

export default myDataSource;
