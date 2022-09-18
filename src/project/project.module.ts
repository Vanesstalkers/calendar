import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { models } from '../globalImport';

import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { ProjectTransferService } from './transfer.service';
import { UserController } from '../user/user.controller';
import { UserService } from '../user/user.service';
import { AuthService } from '../user/auth.service';
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
      models.user2user,
      models.file,
    ]),
  ],
  controllers: [ProjectController],
  providers: [ProjectService, ProjectTransferService, UserController],
  exports: [ProjectService, ProjectTransferService],
})
export class ProjectModule {}
