import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  UnauthorizedException,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class UniversalExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}
  catch(exception: unknown, host: ArgumentsHost): void {
    console.log('UniversalExceptionFilter', { exception });
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const responseBody: any = {
      status: 'error',
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };
    let responseStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    const knownException =
      exception instanceof HttpException ||
      exception instanceof UnauthorizedException ||
      exception instanceof BadRequestException;
    if (knownException) {
      responseStatus = exception.getStatus();
      responseBody.msg = exception.message;
    }else{
      // !!! log
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, responseStatus);
  }
}
