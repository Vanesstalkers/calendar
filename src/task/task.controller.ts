import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify-multipart';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types } from '../globalImport';
import * as util from 'node:util';
import * as fs from 'node:fs';
import * as stream from 'node:stream';

import { TaskService } from './task.service';
import { UserService } from '../user/user.service';
import { ProjectService } from '../project/project.service';
import { UtilsService } from '../utils/utils.service';
import { SessionService } from '../session/session.service';
import { resolve } from 'node:path';

class getOneQueryDTO {
  @swagger.ApiProperty({
    example: 1,
    description: 'ID задачи',
  })
  id: number;
}

class createDTO {
  @swagger.ApiProperty({ type: () => models.task })
  task: types['models']['task'];
  @swagger.ApiProperty({
    example: '1,2',
    description: 'Список исполнителей (без постановщика)',
  })
  executors: string;
  @swagger.ApiProperty({ example: 1, description: 'ID проекта' })
  projectId: string;
  // @swagger.ApiProperty({ type: 'string', format: 'binary' })
  // iconFile: string;
}

@nestjs.Controller('task')
@swagger.ApiTags('task')
@swagger.ApiResponse({
  status: 400,
  description: 'Формат ответа для всех ошибок',
  type: () => interfaces.response.exception,
})
@nestjs.UseGuards(decorators.validateSession)
export class TaskController {
  constructor(
    private taskService: TaskService,
    private userService: UserService,
    private projectService: ProjectService,
    private sessionService: SessionService,
    private utils: UtilsService,
  ) {}

  @nestjs.Post('create')
  @swagger.ApiResponse(new interfaces.response.created())
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiConsumes('multipart/form-data')
  @nestjs.UseGuards(decorators.isLoggedIn)
  async create(
    @nestjs.Req() req: fastify.FastifyRequest,
    @nestjs.Session() session: FastifySession,
    @nestjs.Body() @decorators.Multipart() data: createDTO, // без @nestjs.Body() не будет работать swagger
  ) {
    if (!data.projectId)
      throw new nestjs.BadRequestException('Project ID is empty');
    const projectId = parseInt(data.projectId);
    const projectExists = await this.projectService.checkExists(projectId);
    if (!projectExists)
      throw new nestjs.BadRequestException('Project does not exist');

    const userId = await this.sessionService.getUserId(session);

    const executorList = [];
    for (const id of data.executors?.split(',') || []) {
      const execUserId = parseInt(id);
      const userExists = await this.userService.checkExists(execUserId);
      if (!userExists)
        throw new nestjs.BadRequestException('User does not exist');
      executorList.push(execUserId);
    }
    if (!executorList.includes(userId)) executorList.push(userId);

    const createResult = await this.taskService
      .create({
        task: data.task,
        userId,
        projectId,
        executors: executorList,
      })
      .catch((err: any) => {
        if (err.name === 'SequelizeForeignKeyConstraintError') {
          throw new nestjs.BadRequestException(
            `DB entity does not exist (${err.parent?.detail})`,
          );
        } else {
          throw err;
        }
      });
    return { status: 'ok', data: { id: createResult.id } };
  }

  @nestjs.Get('getOne')
  @nestjs.Header('Content-Type', 'application/json')
  @nestjs.UseGuards(decorators.isLoggedIn)
  async getOne(
    @nestjs.Query() data: getOneQueryDTO,
    @nestjs.Session() session: FastifySession,
  ): Promise<types['models']['task']> {
    if (!data?.id) throw new nestjs.BadRequestException('Task ID is empty');

    return await this.taskService.getOne(data.id);
  }
}
