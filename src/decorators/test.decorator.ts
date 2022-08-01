import * as nestjs from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import * as stream from 'stream';
import * as fs from 'node:fs';
import * as util from 'node:util';

import { SessionService } from '../session/session.service';

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

export const Multipart = nestjs.createParamDecorator(
  async (data: unknown, ctx: nestjs.ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.isMultipart()) {
      throw new nestjs.BadRequestException('Multipart form-data expected');
    }

    const pump = util.promisify(stream.pipeline);
    const value = {};
    const parts = request.parts();
    for await (const part of parts) {
      if (part.file) {
        const tmpPath = './uploads/' + part.filename;
        await pump(part.file, fs.createWriteStream(tmpPath));
        // const buff = await part.toBuffer()
        // const decoded = Buffer.from(buff.toString(), 'base64').toString()
        // value[part.fieldname] = decoded // set `part.value` to specify the request body value
        value[part.fieldname] = {
          filename: part.filename,
          path: tmpPath,
        };
      } else {
        if (part.value[0] === '{') {
          value[part.fieldname] = JSON.parse(part.value);
        } else {
          value[part.fieldname] = part.value;
        }
      }
    }

    return value;
  },
);

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
