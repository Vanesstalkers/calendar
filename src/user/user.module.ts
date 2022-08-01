import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { models } from '../globalImport';

import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UtilsService } from '../utils.service';
import { SessionService } from '../session/session.service';
import { AuthService } from '../auth/auth.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      models.user,
      models.project,
      models.task,
      models.project2user,
    ]),
  ],
  providers: [UtilsService, UserService, SessionService, AuthService],
  controllers: [UserController],
})
export class UserModule {}
