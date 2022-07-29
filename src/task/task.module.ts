import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { SessionService } from '../session/session.service';
import { UtilsService } from '../utils.service';

import { Task } from '../models/task';
import { User } from '../models/user';

@Module({
  imports: [SequelizeModule.forFeature([User, Task])],
  providers: [SessionService, UtilsService, TaskService],
  controllers: [TaskController],
})
export class TaskModule {}
