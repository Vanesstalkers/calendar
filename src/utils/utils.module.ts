import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { models } from '../globalImport';

import { SessionService } from '../session/session.service';
import { UtilsService } from './utils.service';
import { UtilsController } from './utils.controller';

@Module({
  imports: [SequelizeModule.forFeature([])],
  providers: [SessionService, UtilsService],
  controllers: [UtilsController],
})
export class UtilsModule {}
