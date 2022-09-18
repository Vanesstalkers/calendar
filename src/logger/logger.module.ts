import { Module } from '@nestjs/common';
import { MongoClient, Db } from 'mongodb';

import { LoggerService } from './logger.service';

@Module({
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: async (): Promise<Db> => {
        try {
          const client = await MongoClient.connect('mongodb://127.0.0.1');
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
