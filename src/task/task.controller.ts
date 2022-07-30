import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, dto, models, types } from '../globalImport';

import { TaskService } from './task.service';
import { UtilsService } from '../utils.service';
import { SessionService } from '../session/session.service';

class createDTO {
  @swagger.ApiProperty({ type: () => models.task })
  task: types['models']['task'];
  @swagger.ApiProperty({ example: '1,2,3...', description: 'ID проекта' })
  projectId: number;
  // @swagger.ApiProperty({ type: 'string', format: 'binary' })
  // iconFile: string;
}

@nestjs.Controller('task')
@swagger.ApiTags('task')
@swagger.ApiResponse({
  status: 400,
  description: 'Формат ответа для всех ошибок',
  type: () => dto.response.exception,
})
@nestjs.UseGuards(decorators.validateSession)
export class TaskController {
  constructor(
    private taskService: TaskService,
    private sessionService: SessionService,
    private utils: UtilsService,
  ) {}

  @nestjs.Post('create')
  // @swagger.ApiConsumes('multipart/form-data')
  @nestjs.UseGuards(decorators.isLoggedIn)
  async create(
    @nestjs.Body() data: createDTO,
    @nestjs.Session() session: FastifySession,
  ) {
    const userId = await this.sessionService.getUserId(session);
    const createResult = await this.taskService.create({
      task: data.task,
      projectId: data.projectId,
      userId,
    });
    return { status: 'ok' };
  }

  @nestjs.Get('getOne')
  @nestjs.Header('Content-Type', 'application/json')
  @nestjs.UseGuards(decorators.isLoggedIn)
  async getOne(
    @nestjs.Query() data: { id: number },
    @nestjs.Session() session: FastifySession,
  ): Promise<types['models']['task']> {
    if (!data?.id) throw new nestjs.BadRequestException('Task ID is empty');

    return await this.taskService.getOne(data.id);
  }
}
