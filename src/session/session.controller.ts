import {
  Controller,
  Get,
  Post,
  Header,
  Session,
  Body,
  Query,
  Req,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';

import { SessionService } from './session.service';
import { UtilsService } from '../utils.service';
import { SessionStorageI } from './storage.interface';
import Project from '../entity/project';

@Controller('session')
export class SessionController {
  constructor(
    private service: SessionService,
    private utils: UtilsService,
  ) {}

  @Get('getStorage')
  @Header('Content-Type', 'application/json')
  async getStorage(
    @Session() session: FastifySession,
  ): Promise<SessionStorageI> {
    return await this.service.getStorage(session);
  }
}
