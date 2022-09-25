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

    if (request.isMultipart()) request.body = await this.utils.parseMultipart(request);

    await this.logger.startLog(request);
    const storage = await this.sessionService.getStorage(request.session);
    await this.logger.sendLog([{ storage }]);

    return next.handle().pipe(
      map(async (value) => {
        // финализирующая запись в лог
        await this.logger.sendLog({ answerData: value }, { request, finalizeType: 'ok' });

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
