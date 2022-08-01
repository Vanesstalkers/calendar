import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { models } from '../globalImport';

import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { UserService } from '../user/user.service';
import { ProjectService } from '../project/project.service';
import { SessionService } from '../session/session.service';
import { UtilsService } from '../utils.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      models.user,
      models.task,
      models.project,
      models.project2user,
      models.task2user,
    ]),
  ],
  providers: [
    SessionService,
    UtilsService,
    TaskService,
    UserService,
    ProjectService,
  ],
  controllers: [TaskController],
})
export class TaskModule {}
