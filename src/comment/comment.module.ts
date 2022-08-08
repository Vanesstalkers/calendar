import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { models } from '../globalImport';

import { SessionService } from '../session/session.service';
import { UtilsService } from '../utils/utils.service';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';

@Module({
  imports: [SequelizeModule.forFeature([models.comment])],
  providers: [SessionService, UtilsService, CommentService],
  controllers: [CommentController],
})
export class CommentModule {}
