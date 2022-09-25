import * as nestjs from '@nestjs/common';
import { CanActivate } from '@nestjs/common';

import { SessionService } from '../../session/session.service';
import { LoggerService } from '../../logger/logger.service';

@nestjs.Injectable()
export class validateSession implements CanActivate {
  constructor(private sessionService: SessionService) {}
  async canActivate(context: nestjs.ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    this.sessionService.validateSession(request.session);
    return true;
  }
}
@nestjs.Injectable()
export class isLoggedIn implements CanActivate {
  constructor(
    //private reflector: Reflector
    private sessionService: SessionService,
    private logger: LoggerService,
  ) {}
  async canActivate(context: nestjs.ExecutionContext) {
    // const role = this.reflector.get<string>('role', context.getHandler());
    const request = context.switchToHttp().getRequest();
    
    // стартовая запись в лог
    await this.logger.sendLog(
      [
        {
          url: request.url,
          request: {
            ip: request.ip,
            method: request.method,
            protocol: request.protocol,
            headers: request.headers,
          },
        },
        { requestData: request.body || request.query },
      ],
      { request, startType: 'HTTP' },
    );

    if ((await this.sessionService.isLoggedIn(request.session)) !== true) {
      throw new nestjs.ForbiddenException({
        code: 'NEED_LOGIN',
        msg: 'Access denied (login first)',
      });
    }
    return true;
  }
}
