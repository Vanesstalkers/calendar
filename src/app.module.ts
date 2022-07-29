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
import { TaskModule } from './task/task.module';

import { User } from './models/user';
import { Project } from './models/project';
import { ProjectToUser } from './models/project_to_user';
import { Task } from './models/task';
import { TaskGroup } from './models/task_group';
import { Hashtag } from './models/hashtag';
import { TaskToUser } from './models/task_to_user';
import { UserToUser } from './models/user_to_user';
import { Tick } from './models/tick';
import { Comment } from './models/comment';
import { File } from './models/file';

var dbImport: DynamicModule, cacheImport: DynamicModule;

try {
  dbImport = SequelizeModule.forRoot({
    ...config.pg,
    dialect: 'postgres',
    models: ['/models'],
    autoLoadModels: false,
    logging: false,
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
    SequelizeModule.forFeature([User, Project, Task, ProjectToUser, TaskGroup, Hashtag, TaskToUser, UserToUser, Tick, Comment, File]),
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure() {}
}
