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

import { SessionModule } from './session/session.module';
import { UserModule } from './user/user.module';
import { ProjectModule } from './project/project.module';

var dbImport: DynamicModule, cacheImport: DynamicModule;

try {
  dbImport = TypeOrmModule.forRoot({
    ...config.pg,
    type: 'postgres',
    autoLoadEntities: true, //entities: [], // - для ручного импорта
    synchronize: false,
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
  imports: [dbImport, cacheImport, SessionModule, UserModule, ProjectModule],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure() {}
}
