import * as nestjs from '@nestjs/common';
import { Session as FastifySession } from '@fastify/secure-session';

import { SessionService } from './session.service';
import { UtilsService } from '../utils/utils.service';

@nestjs.Controller('session')
export class SessionController {
  constructor(private sessionService: SessionService, private utils: UtilsService) {}

  // @nestjs.Get('getStorage')
  // @nestjs.Header('Content-Type', 'application/json')
  async getStorage(@nestjs.Session() session: FastifySession) {
    return await this.sessionService.getStorage(session);
  }
}
