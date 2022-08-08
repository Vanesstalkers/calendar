import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { models } from '../globalImport';

import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { UtilsService } from '../utils/utils.service';

@Module({
  imports: [],
  providers: [UtilsService, SessionService],
  controllers: [SessionController],
})
export class SessionModule {}
