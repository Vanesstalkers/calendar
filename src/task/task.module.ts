import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { models } from '../globalImport';

import { ProjectController } from '../project/project.controller';
import { ProjectService } from '../project/project.service';
import { ProjectTransferService } from '../project/transfer.service';
import { SessionService } from '../session/session.service';
import { UserController } from '../user/user.controller';
import { UserService } from '../user/user.service';
import { UtilsService } from '../utils/utils.service';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { FileService } from '../file/file.service';
import { LoggerService } from '../logger/logger.service';

import { UserModule } from '../user/user.module';

@Module({
  imports: [
    SequelizeModule.forFeature([
      models.user,
      models.user2user,
      models.task,
      models.project,
      models.project2user,
      models.task2user,
      models.tick,
      models.hashtag,
      models.file,
    ]),
  ],
  controllers: [TaskController],
  providers: [TaskService, UserController, ProjectController],
  exports: [TaskService]
})
export class TaskModule {}
