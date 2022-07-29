import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Inject, Injectable, CanActivate } from '@nestjs/common';
import { SessionService } from '../session/session.service';

@Injectable()
export class validateSession implements CanActivate {
  constructor(private sessionService: SessionService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    this.sessionService.validateSession(request.session);
    return true;
  }
}
@Injectable()
export class isLoggedIn implements CanActivate {
  constructor(
    //private reflector: Reflector
    private sessionService: SessionService,
  ) {}
  async canActivate(context: ExecutionContext) {
    // const role = this.reflector.get<string>('role', context.getHandler());
    const request = context.switchToHttp().getRequest();
    if ((await this.sessionService.isLoggedIn(request.session)) !== true)
      throw new ForbiddenException('Access denied');
    return true;
  }
}

/* export const validSession = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {session: request.session, needValid: true};
  },
);

export function customCheck(bubble = true) {
  const injectService = Inject(SessionService);

  return (target: any, propertyKey: string, propertyDescriptor: PropertyDescriptor) => {
    injectService(target, 'sessionService');
    const originalMethod = propertyDescriptor.value;
    propertyDescriptor.value = async function(...args: any[]) {
        for(const i in args){
          if(args[i].needValid){
            const session = args[i].session;
            this.sessionService.validateSession(session);
            // if ((await this.sessionService.isLoggedIn(session)) !== true)
            //   throw new ForbiddenException('Access denied');
            args[i] = session;
          }
        }
        return await originalMethod.apply(this, args);
    };
  };
} */
