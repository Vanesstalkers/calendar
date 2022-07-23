import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { SessionService } from '../session/session.service';
import { AuthService } from '../auth/auth.service';
import { UtilsService } from '../utils.service';
import { UserController } from './user.controller';
import { User } from './user.entity';
import { Project } from '../project/project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Project]),
  ],
  providers: [UserService, SessionService, AuthService, UtilsService],
  controllers: [UserController],
})
export class UserModule {}
