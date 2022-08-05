import * as nestjs from '@nestjs/common';
import { CanActivate } from '@nestjs/common';

import { SessionService } from '../../session/session.service';

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
  ) {}
  async canActivate(context: nestjs.ExecutionContext) {
    // const role = this.reflector.get<string>('role', context.getHandler());
    const request = context.switchToHttp().getRequest();
    if ((await this.sessionService.isLoggedIn(request.session)) !== true)
      throw new nestjs.ForbiddenException('Access denied');
    return true;
  }
}