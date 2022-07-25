import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { SessionService } from '../session/session.service';
import { UtilsService } from '../utils.service';

import { User } from '../models/user';
import { Project } from '../models/project';
import { ProjectToUser } from '../models/project_to_user';
import { Task } from '../models/task';

@Module({
  imports: [SequelizeModule.forFeature([User, Project, Task, ProjectToUser])],
  providers: [SessionService, UtilsService, ProjectService],
  controllers: [ProjectController],
})
export class ProjectModule {}
