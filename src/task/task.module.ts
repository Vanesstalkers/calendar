import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { models } from '../globalImport';

import { ProjectService } from '../project/project.service';
import { SessionService } from '../session/session.service';
import { UserService } from '../user/user.service';
import { UtilsService } from '../utils/utils.service';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

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
    ]),
  ],
  providers: [SessionService, UtilsService, TaskService, UserService, ProjectService],
  controllers: [TaskController],
})
export class TaskModule {}
