import * as nestjs from '@nestjs/common';
import { CanActivate } from '@nestjs/common';

import { SessionService } from '../../session/session.service';
import { LoggerService } from '../../logger/logger.service';

@nestjs.Injectable()
export class validateSession implements CanActivate {
  constructor(private sessionService: SessionService) {}
  async canActivate(context: nestjs.ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    await this.sessionService.validateSession(request.session);
    return true;
  }
}
@nestjs.Injectable()
export class isLoggedIn implements CanActivate {
  constructor(private sessionService: SessionService, private logger: LoggerService) {}
  async canActivate(context: nestjs.ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    if ((await this.sessionService.isLoggedIn(request.session)) !== true) {
      await this.logger.startLog(request); // запрос не попадет в interceptor, где происходит дефолтная стартовая запись в лог
      throw new nestjs.ForbiddenException({
        code: 'NEED_LOGIN',
        msg: 'Access denied (login first)',
      });
    }
    return true;
  }
}
