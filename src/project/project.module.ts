import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { models } from '../globalImport';

import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { SessionService } from '../session/session.service';
import { UtilsService } from '../utils.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      models.user,
      models.project,
      models.task,
      models.project2user,
    ]),
  ],
  providers: [SessionService, UtilsService, ProjectService],
  controllers: [ProjectController],
})
export class ProjectModule {}
