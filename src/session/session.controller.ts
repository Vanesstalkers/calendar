import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, types, httpAnswer, interceptors } from '../globalImport';

import { SessionService } from './session.service';

@nestjs.Controller('session')
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@nestjs.UseGuards(decorators.validateSession)
@swagger.ApiTags('session')
@swagger.ApiResponse({ status: 400, description: 'Формат ответа для всех ошибок', type: interfaces.response.exception })
export class SessionController {
  constructor(private sessionService: SessionService) {}

  @nestjs.Get('getCurrent')
  @swagger.ApiResponse(new interfaces.response.success({ models: [interfaces.session.storage] }))
  async getCurrent(@nestjs.Session() session: FastifySession) {
    const result = await this.sessionService.getState(session.id);
    return { ...httpAnswer.OK, data: result };
  }
}
