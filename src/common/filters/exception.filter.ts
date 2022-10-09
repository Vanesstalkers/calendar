import * as nestjs from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { decorators, interfaces, types, httpAnswer } from '../../globalImport';

import { LoggerService } from '../../logger/logger.service';

export function fsErrorCatcher(err: any): any {
  console.log('fsErrorCatcher', { err });
  if (err.code === 'ENOENT') {
    throw new nestjs.InternalServerErrorException({
      code: 'ENOENT',
      msg: err.message,
    });
    //
  } else {
    throw err;
  }
}

export function dbErrorCatcher(err: any): any {
  console.log('dbErrorCatcher', { err });
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    throw new nestjs.BadRequestException({
      code: 'DB_BAD_QUERY',
      msg: `DB entity does not exist (${err.parent?.detail})`,
    });
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    throw new nestjs.BadRequestException({
      code: 'DB_BAD_QUERY',
      msg: `Dublicate unique key (${err.parent?.detail})`,
    });
  } else if (err.name === 'SequelizeDatabaseError' || err.message.includes('Invalid value')) {
    throw new nestjs.BadRequestException({
      code: 'DB_BAD_QUERY',
      msg: err.message,
    });
  } else {
    throw err;
  }
}

@nestjs.Catch()
@nestjs.Injectable({ scope: nestjs.Scope.REQUEST })
export class UniversalExceptionFilter implements nestjs.ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost, private logger: LoggerService) {}
  async catch(exception: unknown, host: nestjs.ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const request = host.switchToHttp().getRequest();
    const response = host.switchToHttp().getResponse();
    const responseBody: types['interfaces']['response']['exception'] = {
      ...httpAnswer.ERR,
      timestamp: new Date(),
      path: httpAdapter.getRequestUrl(request),
    };
    let responseStatus = nestjs.HttpStatus.INTERNAL_SERVER_ERROR;

    const knownException =
      exception instanceof nestjs.HttpException ||
      exception instanceof nestjs.UnauthorizedException ||
      exception instanceof nestjs.BadRequestException ||
      exception instanceof nestjs.ForbiddenException ||
      exception instanceof nestjs.InternalServerErrorException;
    if (knownException) {
      responseStatus = exception.getStatus();
      const exceptionData: any = exception.getResponse();
      responseBody.msg = exceptionData.msg || exception.message;
      responseBody.code = exceptionData.code;
    } else {
      console.log('unknownException in UniversalExceptionFilter', { exception });
    }

    httpAdapter.reply(response, responseBody, responseStatus);

    // если вызвать логгер раньше, то reply не отработает (https://stackoverflow.com/questions/63812764/nestjs-async-operation-inside-error-filter)
    await this.logger.sendLog({ exception: responseBody }, { request, finalizeType: 'error' });
  }
}
