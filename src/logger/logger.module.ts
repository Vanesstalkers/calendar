import * as nestjs from '@nestjs/common';
import { MongoClient, Db } from 'mongodb';

import { getConfig } from '../config';
const config = getConfig();
import { LoggerService, LoggerServiceSingleton } from './logger.service';

@nestjs.Module({
  controllers: [],
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: async (): Promise<Db> => {
        try {
          const client = await MongoClient.connect(config.mongo, { useUnifiedTopology: true });
          return client.db('calendar');
        } catch (err) {
          console.log('!!! LOGS DISABLED !!!');
          console.log(err);
          return null;
        }
      },
    },
    LoggerService,
    LoggerServiceSingleton,
  ],
  exports: ['DATABASE_CONNECTION', LoggerService, LoggerServiceSingleton],
})
export class LoggerModule {}
