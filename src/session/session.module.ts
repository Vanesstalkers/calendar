import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { UtilsService } from '../utils.service';

@Module({
  imports: [],
  providers: [UtilsService, SessionService],
  controllers: [SessionController],
})
export class SessionModule {}
