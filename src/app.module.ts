import { Module, NestModule, DynamicModule, Global, CacheModule } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ScheduleModule } from '@nestjs/schedule';
import { models } from './globalImport';

import config from './config';
import type { ClientOpts } from 'redis';
import * as redisStore from 'cache-manager-redis-store';

import { SessionModule } from './session/session.module';
import { UserModule } from './user/user.module';
import { ProjectModule } from './project/project.module';
import { TaskModule } from './task/task.module';
import { CommentModule } from './comment/comment.module';
import { FileModule } from './file/file.module';
import { UtilsModule } from './utils/utils.module';

var dbImport: DynamicModule, cacheImport: DynamicModule;

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
    ProjectModule,
    TaskModule,
    CommentModule,
    FileModule,
    UtilsModule,
    ScheduleModule.forRoot(),
    SequelizeModule.forFeature([
      models.user,
      models.project,
      models.task,
      models.project2user,
      models.taskgroup,
      models.hashtag,
      models.task2user,
      models.user2user,
      models.comment,
      models.tick,
      models.file,
    ]),
  ],
  providers: [],
  controllers: [],
})
export class AppModule implements NestModule {
  configure() {}
}
