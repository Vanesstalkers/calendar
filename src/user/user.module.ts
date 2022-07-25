import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UtilsService } from '../utils.service';
import { SessionService } from '../session/session.service';
import { AuthService } from '../auth/auth.service';

import { User } from '../models/user';
import { Project } from '../models/project';
import { ProjectToUser } from '../models/project_to_user';
import { Task } from '../models/task';

@Module({
  imports: [SequelizeModule.forFeature([User, Project, Task, ProjectToUser])],
  providers: [UtilsService, UserService, SessionService, AuthService],
  controllers: [UserController],
})
export class UserModule {}
