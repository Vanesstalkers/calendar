import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { models } from '../globalImport';

import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { SessionService } from '../session/session.service';
import { UtilsService } from '../utils.service';

@Module({
  imports: [SequelizeModule.forFeature([models.user, models.task])],
  providers: [SessionService, UtilsService, TaskService],
  controllers: [TaskController],
})
export class TaskModule {}
