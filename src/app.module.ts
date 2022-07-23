import {
  Module,
  NestModule,
  DynamicModule,
  Global,
  CacheModule,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import config from './config';
import type { ClientOpts } from 'redis';
import * as redisStore from 'cache-manager-redis-store';

import { UserModule } from './user/user.module';

var dbImport: DynamicModule, cacheImport: DynamicModule;
try {
  dbImport = TypeOrmModule.forRoot({
    ...config.pg,
    type: 'postgres',
    autoLoadEntities: true, //entities: [], - для ручного импорта
    synchronize: process.env.MODE === 'DEV',
  });
} catch (err) {
  console.log({ err });
}
try {
  let cacheImportOpts: object = {
    isGlobal: true,
  };
  if (true) {
    // тут добавляем проверку на возможность подключения к redis
    cacheImportOpts = {
      ...cacheImportOpts,
      ...config.redis,
      store: redisStore,
    };
  }
  cacheImport = CacheModule.register<ClientOpts>(cacheImportOpts);
} catch (err) {
  // !!! не ловит
  console.log({ err });
}

@Global()
@Module({
  imports: [dbImport, cacheImport, UserModule],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure() {}
}
