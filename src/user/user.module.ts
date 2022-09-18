import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { models } from '../globalImport';

import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UtilsService } from '../utils/utils.service';
import { SessionService } from '../session/session.service';
import { AuthService } from './auth.service';
import { ProjectService } from '../project/project.service';
import { FileService } from '../file/file.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      models.user,
      models.user2user,
      models.project,
      models.task,
      models.project2user,
      models.file,
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, AuthService],
  exports: [UserService, AuthService],
})
export class UserModule {}
