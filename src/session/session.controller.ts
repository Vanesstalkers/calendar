import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types } from '../globalImport';

import { SessionService } from './session.service';
import { UtilsService } from '../utils/utils.service';
import { SessionStorageI } from './interfaces/storage.interface';

@nestjs.Controller('session')
export class SessionController {
  constructor(
    private sessionService: SessionService,
    private utils: UtilsService,
  ) {}

  // @nestjs.Get('getStorage')
  // @nestjs.Header('Content-Type', 'application/json')
  async getStorage(
    @nestjs.Session() session: FastifySession,
  ): Promise<SessionStorageI> {
    return await this.sessionService.getStorage(session);
  }
}
