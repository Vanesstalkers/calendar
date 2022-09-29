import * as nestjs from '@nestjs/common';
import { MongoClient, Db } from 'mongodb';

import { LoggerService } from './logger.service';

import { getConfig } from '../config';
const config = getConfig();

@nestjs.Module({
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: async (): Promise<Db> => {
        try {
          const client = await MongoClient.connect(config.mongo);
          return client.db('calendar');
        } catch (e) {
          throw e;
        }
      },
    },
    LoggerService,
  ],
  exports: ['DATABASE_CONNECTION', LoggerService],
})
export class LoggerModule {}
