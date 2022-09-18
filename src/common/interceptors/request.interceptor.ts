import * as nestjs from '@nestjs/common';
import { map } from 'rxjs/operators';
import { LoggerService } from '../../logger/logger.service';

import { UtilsService } from '../../utils/utils.service';
import { SessionService } from '../../session/session.service';

@nestjs.Injectable()
export class PostStatusInterceptor {
  constructor(private sessionService: SessionService, private utils: UtilsService, private logger: LoggerService) {}
  async intercept(context: nestjs.ExecutionContext, next: nestjs.CallHandler) {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    const storage = await this.sessionService.getStorage(request.session);
    
    if (request.isMultipart()) request.body = await this.utils.parseMultipart(request);

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
          storage,
        },
        { data: request.body || request.query },
      ],
      { request },
    );
    return next.handle().pipe(
      map(async (value) => {
        await this.logger.sendLog({ data: value }, { request });
        if (request.method === 'POST') {
          if (response.statusCode === nestjs.HttpStatus.CREATED) {
            response.status(nestjs.HttpStatus.OK);
          }
        }
        return value;
      }),
    );
  }
}
