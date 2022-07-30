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
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { validateSession, isLoggedIn } from '../decorators/test.decorator';
import {
  ApiBody,
  ApiQuery,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
  ApiExtraModels,
  getSchemaPath,
  ApiConsumes,
} from '@nestjs/swagger';

import { TaskService } from './task.service';
import { UtilsService } from '../utils.service';
import { SessionService } from '../session/session.service';

import { Task } from '../models/task';

import {
  exceptonAnswerDTO,
  emptyAnswerDTO,
  successAnswerDTO,
} from '../dto/httpAnswer';

class createDTO {
  @ApiProperty({ type: ()=>Task })
  task: Task
  @ApiProperty({ example: '1,2,3...', description: 'ID проекта' })
  projectId: number
}

@Controller('task')
@ApiTags('task')
@ApiResponse({
  status: 400,
  description: 'Формат ответа для всех ошибок',
  type: () => exceptonAnswerDTO,
})
@UseGuards(validateSession)
export class TaskController {
  constructor(
    private taskService: TaskService,
    private sessionService: SessionService,
    private utils: UtilsService,
  ) {}

  @Post('create')
  @ApiConsumes('multipart/form-data')
  @UseGuards(isLoggedIn)
  async create(@Body() data: createDTO, @Session() session: FastifySession) {
    const userId = await this.sessionService.getUserId(session);
    const createResult = await this.taskService.create({
      task: data.task,
      projectId: data.projectId,
      userId
    });
    return { status: 'ok' };
  }

  @Get('getOne')
  @Header('Content-Type', 'application/json')
  async getOne(
    @Query() data: { id: number },
    @Session() session: FastifySession,
  ): Promise<Task> {
    if ((await this.sessionService.isLoggedIn(session)) !== true)
     throw new ForbiddenException('Access denied');
    if (!data?.id) throw new BadRequestException('Task ID is empty');

    return await this.taskService.getOne(data.id);
  }
}
