import * as nestjs from '@nestjs/common';
import { NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { SequelizeModule } from '@nestjs/sequelize';
import { ScheduleModule } from '@nestjs/schedule';
import { Logger } from './globalImport';

import type { ClientOpts } from 'redis';
import * as redisStore from 'cache-manager-redis-store';

import { SessionModule } from './session/session.module';
import { UserModule } from './user/user.module';
import { ProjectModule } from './project/project.module';
import { TaskModule } from './task/task.module';
import { CommentModule } from './comment/comment.module';
import { FileModule } from './file/file.module';
import { UtilsModule } from './utils/utils.module';
import { LoggerModule } from './logger/logger.module';

import { UniversalExceptionFilter } from './common/filters/exception.filter';

import { getConfig } from './config';
const config = getConfig();

var dbImport: nestjs.DynamicModule, cacheImport: nestjs.DynamicModule;

try {
  dbImport = SequelizeModule.forRoot({
    ...config.pg,
    dialect: 'postgres',
    models: ['/models'],
    autoLoadModels: true,
    synchronize: false, // если удалить или поставить в true, то начнет перетирать данные
    // logging: false,
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
  cacheImport = nestjs.CacheModule.register<ClientOpts>(cacheImportOpts);
} catch (err) {
  // !!! не ловит
  console.log({ err });
}

@nestjs.Global()
@nestjs.Module({
  imports: [
    dbImport,
    cacheImport,
    LoggerModule,
    UserModule,
    SessionModule,
    ProjectModule,
    TaskModule,
    CommentModule,
    FileModule,
    UtilsModule,
    ScheduleModule.forRoot(),
    SequelizeModule.forFeature([Logger]), // тут фейковый класс, без которого не работают иньекции в PostStatusInterceptor
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: UniversalExceptionFilter,
    },
    // все равно так тоже не работает иньекция в PostStatusInterceptor
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: PostStatusInterceptor,
    // },
  ],
  controllers: [],
  exports: [LoggerModule, UserModule, SessionModule, ProjectModule, TaskModule, CommentModule, FileModule, UtilsModule],
})
export class AppModule implements NestModule {
  configure() {}
}
