import * as nestjs from '@nestjs/common';
import { CanActivate } from '@nestjs/common';

import { AppServiceSingleton } from '../../app.service';
import { SessionService } from '../../session/session.service';
import { LoggerService } from '../../logger/logger.service';

// вызываю это здесь, потому что в ParamDecorator не работают иньекции
@nestjs.Injectable()
export class validateSession implements CanActivate {
  constructor(public appService: AppServiceSingleton, private sessionService: SessionService) {}
  async canActivate(context: nestjs.ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const session = request.session;
    if (!session.id) session.id = await this.sessionService.create();
    else if (!(await this.sessionService.get(session.id))) await this.sessionService.create(session.id);
    return true;
  }
}
@nestjs.Injectable()
export class isLoggedIn implements CanActivate {
  constructor(private sessionService: SessionService, private logger: LoggerService) {}
  async canActivate(context: nestjs.ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const isLoggedIn = await this.sessionService.isLoggedIn(request.session);
    if (isLoggedIn !== true) {
      await this.logger.startLog(request); // запрос не попадет в interceptor, где происходит дефолтная стартовая запись в лог
      throw new nestjs.ForbiddenException({ code: 'NEED_LOGIN', msg: 'Access denied (login first)' });
    }
    return true;
  }
}
