import * as nestjs from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import {
  decorators,
  interfaces,
  models,
  types,
  httpAnswer,
} from '../../globalImport';

export function dbErrorCatcher(err: any): any {
  console.log('dbErrorCatcher', { err });
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    throw new nestjs.BadRequestException(
      `DB entity does not exist (${err.parent?.detail})`,
    );
  } else if (
    err.name === 'SequelizeDatabaseError' ||
    err.message.includes('Invalid value')
  ) {
    throw new nestjs.BadRequestException(err.message);
  } else {
    throw err;
  }
}

@nestjs.Catch()
export class UniversalExceptionFilter implements nestjs.ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}
  catch(exception: unknown, host: nestjs.ArgumentsHost): void {
    console.log('UniversalExceptionFilter', { exception });
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const responseBody: types['interfaces']['response']['exception'] = {
      ...httpAnswer.ERR,
      timestamp: new Date(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };
    let responseStatus = nestjs.HttpStatus.INTERNAL_SERVER_ERROR;

    const knownException =
      exception instanceof nestjs.HttpException ||
      exception instanceof nestjs.UnauthorizedException ||
      exception instanceof nestjs.BadRequestException ||
      exception instanceof nestjs.ForbiddenException;
    if (knownException) {
      responseStatus = exception.getStatus();
      responseBody.msg = exception.message;
    } else {
      // !!! добавить запись в лог
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, responseStatus);
  }
}
