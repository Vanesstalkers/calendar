import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify-multipart';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types, exception, httpAnswer, interceptors } from '../globalImport';

import { TaskService } from './task.service';
import { UserService } from '../user/user.service';
import { ProjectService } from '../project/project.service';
import { UtilsService } from '../utils/utils.service';
import { SessionService } from '../session/session.service';

class getOneQueryDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  id: number;
}

class createDTO {
  @swagger.ApiProperty({ type: () => models.task })
  taskData: types['models']['task'];
  @swagger.ApiPropertyOptional({ description: 'ID проекта' })
  projectId: string;
  @swagger.ApiPropertyOptional({ type: 'string', format: 'binary' })
  file?: string;
}

class updateDTO {
  @swagger.ApiPropertyOptional({ description: 'ID задачи' })
  taskId: number;
  @swagger.ApiProperty({ type: () => models.task })
  taskData: types['models']['task'];
  // @swagger.ApiProperty({ type: 'string', format: 'binary' })
  // iconFile: string;
}

class confirmByUserDTO {
  @swagger.ApiPropertyOptional({ description: 'ID задачи' })
  taskId: number;
  @swagger.ApiProperty({
    example: 'inwork',
    description: 'Пользователь принял задачу',
  })
  status: string;
}

@nestjs.Controller('task')
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@nestjs.UseGuards(decorators.validateSession)
@swagger.ApiTags('task')
@swagger.ApiResponse({
  status: 400,
  description: 'Формат ответа для всех ошибок',
  type: () => interfaces.response.exception,
})
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
    @nestjs.Session() session: FastifySession,
    @nestjs.Body() @decorators.Multipart() data: createDTO, // без @nestjs.Body() не будет работать swagger
  ) {
    if (!data.projectId) throw new nestjs.BadRequestException('Project ID is empty');

    if (!data.taskData.__tasktouser) data.taskData.__tasktouser = [];
    // const projectExists = await this.projectService.checkExists(projectId);
    // if (!projectExists)
    //   throw new nestjs.BadRequestException('Project does not exist');

    // for (const execUser of data.task.__tasktouser || []) {
    //   const userExists = await this.userService.checkExists(execUser.id);
    //   if (!userExists)
    //     throw new nestjs.BadRequestException('User does not exist');
    // }
    const userId = await this.sessionService.getUserId(session);
    if (!data.taskData.__tasktouser.find((user) => user.id === userId))
      data.taskData.__tasktouser.push({
        id: userId,
        role: 'owner',
        status: 'wait_for_confirm',
      });
    for (const link of data.taskData.__tasktouser) {
      if (!link.role) link.role = 'exec';
      if (!link.status) link.status = 'confirm';
    }

    const task = await this.taskService.create(parseInt(data.projectId), data.taskData).catch(exception.dbErrorCatcher);

    return { ...httpAnswer.OK, data: { id: task.id } };
  }

  @nestjs.Get('getOne')
  @nestjs.Header('Content-Type', 'application/json')
  @nestjs.UseGuards(decorators.isLoggedIn)
  async getOne(
    @nestjs.Query() data: getOneQueryDTO,
    @nestjs.Session() session: FastifySession,
  ): Promise<{
    status: string;
    data: types['models']['task'] | types['interfaces']['response']['empty'];
  }> {
    if (!data?.id) throw new nestjs.BadRequestException('Task ID is empty');
    const userId = await this.sessionService.getUserId(session);
    const result = await this.taskService.getOne({ id: data.id, userId });
    return {
      ...httpAnswer.OK,
      data: result || new interfaces.response.empty(),
    };
  }

  @nestjs.Post('update')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiBody({ type: updateDTO })
  async update(@nestjs.Session() session: FastifySession, @nestjs.Body() data: updateDTO) {
    await this.taskService.update(data.taskId, data.taskData);

    return httpAnswer.OK;
  }

  @nestjs.Post('confirmByUser')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiBody({ type: confirmByUserDTO })
  async confirmByUser(@nestjs.Session() session: FastifySession, @nestjs.Body() data: confirmByUserDTO) {
    const userId = await this.sessionService.getUserId(session);
    const link = await this.taskService.getLinkToUser(data.taskId, userId);
    if (!link) throw new nestjs.BadRequestException(`Task (id=${data.taskId}) not found for user (id=${userId})`);
    await this.taskService.updateLinkToUser(link.id, { status: data.status });

    return httpAnswer.OK;
  }
}
