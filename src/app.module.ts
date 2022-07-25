import {
  Module,
  NestModule,
  DynamicModule,
  Global,
  CacheModule,
} from '@nestjs/common';

import { SequelizeModule } from '@nestjs/sequelize';

import config from './config';
import type { ClientOpts } from 'redis';
import * as redisStore from 'cache-manager-redis-store';

import { SessionModule } from './session/session.module';
import { UserModule } from './user/user.module';
import { ProjectModule } from './project/project.module';

var dbImport: DynamicModule, cacheImport: DynamicModule;

try {
  dbImport = SequelizeModule.forRoot({
    ...config.pg,
    dialect: 'postgres',
    models: ['/models'],
    autoLoadModels: true,
  });
} catch (err) {
  // !!! нужно пробросить корректную ошибку
  console.log({ err });
}

try {
  let cacheImportOpts: object = {
    isGlobal: true,
  };
  if (true) {
    // !!! тут добавляем проверку на возможность подключения к redis (если не доступен, то убираем store: redisStore)
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
  imports: [
    dbImport,
    cacheImport,
    UserModule,
    SessionModule,
    UserModule,
    ProjectModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure() {}
}
