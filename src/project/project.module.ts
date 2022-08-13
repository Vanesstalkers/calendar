import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { models } from '../globalImport';

import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { SessionService } from '../session/session.service';
import { FileService } from '../file/file.service';
import { UtilsService } from '../utils/utils.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      models.user,
      models.project,
      models.task,
      models.project2user,
      models.file,
    ]),
  ],
  providers: [SessionService, UtilsService, ProjectService, FileService],
  controllers: [ProjectController],
})
export class ProjectModule {}
