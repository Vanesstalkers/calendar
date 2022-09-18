import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { models } from '../globalImport';

import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { UtilsService } from '../utils/utils.service';

@Module({
  imports: [],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
