import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import { exceptonAnswerDTO } from './dto/httpAnswer';

@Catch()
export class UniversalExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}
  catch(exception: unknown, host: ArgumentsHost): void {
    console.log('UniversalExceptionFilter', { exception });
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const responseBody: exceptonAnswerDTO = {
      status: 'error',
      timestamp: new Date(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };
    let responseStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    const knownException =
      exception instanceof HttpException ||
      exception instanceof UnauthorizedException ||
      exception instanceof BadRequestException ||
      exception instanceof ForbiddenException;
    if (knownException) {
      responseStatus = exception.getStatus();
      responseBody.msg = exception.message;
    } else {
      // !!! добавить запись в лог
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, responseStatus);
  }
}
