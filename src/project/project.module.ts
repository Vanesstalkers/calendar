import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { UtilsService } from '../utils.service';
import User from '../entity/user';
import Project from '../entity/project';
import Task from '../entity/task';
import LinkProjectToUser from '../entity/project_to_user';

@Module({
  imports: [TypeOrmModule.forFeature([User, Project, Task, LinkProjectToUser])],
  providers: [UtilsService, ProjectService],
  controllers: [ProjectController],
})
export class ProjectModule {}
 