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

import { ProjectService } from './project.service';
import { UtilsService } from '../utils.service';
import { SessionService } from '../session/session.service';
import Project from '../entity/project';

@Controller('project')
export class ProjectController {
  constructor(
    private service: ProjectService,
    private sessionService: SessionService,
    private utils: UtilsService,
  ) {}

  @Get('getOne')
  @Header('Content-Type', 'application/json')
  async getOne(
    @Query() data: { id: number },
    @Session() session: FastifySession,
  ): Promise<Project> {
    if ((await this.sessionService.isLoggedIn(session)) !== true)
      throw new ForbiddenException('Access denied');
    if (!data?.id) throw new BadRequestException('Project ID is empty');

    return await this.service.getOne(data.id);
  }
}
