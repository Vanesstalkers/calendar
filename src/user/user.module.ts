import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UtilsService } from '../utils.service';
import { SessionService } from '../session/session.service';
import { AuthService } from '../auth/auth.service';
import User from '../entity/user';
import Project from '../entity/project';
import Task from '../entity/task';
import LinkProjectToUser from '../entity/project_to_user';

@Module({
  imports: [TypeOrmModule.forFeature([User, Project, Task, LinkProjectToUser])],
  providers: [UtilsService, UserService, SessionService, AuthService],
  controllers: [UserController],
})
export class UserModule {}
