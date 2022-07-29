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

import { TaskService } from './task.service';
import { UtilsService } from '../utils.service';
import { SessionService } from '../session/session.service';

import { Task } from '../models/task';

@Controller('task')
export class TaskController {
  constructor(
    private service: TaskService,
    private sessionService: SessionService,
    private utils: UtilsService,
  ) {}

  @Get('getOne')
  @Header('Content-Type', 'application/json')
  async getOne(
    @Query() data: { id: number },
    @Session() session: FastifySession,
  ): Promise<Task> {
    if ((await this.sessionService.isLoggedIn(session)) !== true)
     throw new ForbiddenException('Access denied');
    if (!data?.id) throw new BadRequestException('Task ID is empty');

    return await this.service.getOne(data.id);
  }
}
