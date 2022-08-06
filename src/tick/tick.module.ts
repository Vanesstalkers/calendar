import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { models } from '../globalImport';

import { SessionService } from '../session/session.service';
import { UtilsService } from '../utils/utils.service';
import { TickController } from './tick.controller';
import { TickService } from './tick.service';

@Module({
  imports: [SequelizeModule.forFeature([models.tick])],
  providers: [SessionService, UtilsService, TickService],
  controllers: [TickController],
})
export class TickModule {}
