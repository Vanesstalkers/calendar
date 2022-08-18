import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify-multipart';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types, exception, httpAnswer, interceptors } from '../globalImport';

import {
  taskCreateQueryDTO,
  taskUpdateQueryDTO,
  taskUpdateUserStatusQueryDTO,
  taskDeleteUserQueryDTO,
  taskDeleteTickQueryDTO,
  taskDeleteHashtagQueryDTO,
  taskGetOneQueryDTO,
  taskGetOneAnswerDTO,
  taskSearchAnswerDTO,
  taskSearchAllAnswerDTO,
  taskSearchQueryDTO,
  taskSearchAllQueryDTO,
} from './task.dto';

import { TaskService } from './task.service';
import { UserService } from '../user/user.service';
import { ProjectService } from '../project/project.service';
import { UtilsService } from '../utils/utils.service';
import { SessionService } from '../session/session.service';

@nestjs.Controller('task')
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@nestjs.UseGuards(decorators.validateSession)
@swagger.ApiTags('task')
@swagger.ApiResponse({ status: 400, description: 'Формат ответа для всех ошибок', type: interfaces.response.exception })
@swagger.ApiExtraModels(taskGetOneAnswerDTO, taskSearchAnswerDTO, taskSearchAllAnswerDTO)
export class TaskController {
  constructor(
    private taskService: TaskService,
    private userService: UserService,
    private projectService: ProjectService,
    private sessionService: SessionService,
    private utils: UtilsService,
  ) {}

  @nestjs.Post('create')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiResponse(new interfaces.response.created())
  @swagger.ApiBody({ type: taskCreateQueryDTO })
  async create(@nestjs.Body() data: taskCreateQueryDTO, @nestjs.Session() session: FastifySession) {
    if (!data.projectId) throw new nestjs.BadRequestException('Project ID is empty');

    if (!data.taskData.userList) data.taskData.userList = [];
    const projectExists = await this.projectService.checkExists(data.projectId);
    if (!projectExists) throw new nestjs.BadRequestException('Project does not exist');

    for (const execUser of data.taskData.userList || []) {
      const userExists = await this.userService.checkExists(execUser.userId);
      if (!userExists) throw new nestjs.BadRequestException('User does not exist');
    }

    const userId = await this.sessionService.getUserId(session);
    data.taskData.ownUser = userId;
    // if (!data.taskData.userList.find((user) => user.userId === userId))
    //   data.taskData.userList.push({ userId, role: 'owner', status: 'wait_for_confirm' });
    for (const link of data.taskData.userList) {
      if (!link.role) link.role = 'exec';
      if (!link.status) link.status = 'confirm';
    }

    const task = await this.taskService.create(data.projectId, data.taskData).catch(exception.dbErrorCatcher);
    return { ...httpAnswer.OK, data: { id: task.id } };
  }

  @nestjs.Get('getOne')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiResponse(new interfaces.response.success({ models: [taskGetOneAnswerDTO] }))
  async getOne(@nestjs.Query() data: taskGetOneQueryDTO, @nestjs.Session() session: FastifySession) {
    if (!data?.taskId) throw new nestjs.BadRequestException('Task ID is empty');

    const userId = await this.sessionService.getUserId(session);
    const result = await this.taskService.getOne({ id: data.taskId, userId });
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('searchAll')
  @nestjs.Header('Content-Type', 'application/json')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.search({ model: taskSearchAllAnswerDTO }))
  async searchAll(@nestjs.Body() data: taskSearchAllQueryDTO, @nestjs.Session() session: FastifySession) {
    if (!data.query || data.query.length < 3) throw new nestjs.BadRequestException('query is empty or too short');
    const sessionData = await this.sessionService.getState(session);
    data.projectId = sessionData.currentProjectId;
    const result = await this.taskService.searchAll(data);
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('search')
  @nestjs.Header('Content-Type', 'application/json')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.search({ model: taskSearchAnswerDTO }))
  async search(@nestjs.Body() data: taskSearchQueryDTO, @nestjs.Session() session: FastifySession) {
    const sessionData = await this.sessionService.getState(session);
    data.projectId = sessionData.currentProjectId;
    const result = await this.taskService.search(data, sessionData.userId);
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('update')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiBody({ type: taskUpdateQueryDTO })
  @swagger.ApiResponse(new interfaces.response.success())
  async update(@nestjs.Session() session: FastifySession, @nestjs.Body() data: taskUpdateQueryDTO) {
    await this.taskService.update(data.taskId, data.taskData);
    return httpAnswer.OK;
  }

  async getUserLink(taskId: number, userId: number) {
    const link = await this.taskService.getUserLink(taskId, userId);
    if (!link) throw new nestjs.BadRequestException(`Task (id=${taskId}) not found for user (id=${userId})`);
    return link;
  }

  @nestjs.Post('updateUserStatus')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiBody({ type: taskUpdateUserStatusQueryDTO })
  @swagger.ApiResponse(new interfaces.response.success())
  async updateUserStatus(@nestjs.Body() data: taskUpdateUserStatusQueryDTO) {
    const link = await this.getUserLink(data.taskId, data.userId);
    await this.taskService.updateUserLink(link.id, { userId: data.userId, status: data.status });
    return httpAnswer.OK;
  }

  @nestjs.Delete('deleteUser')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiBody({ type: taskDeleteUserQueryDTO })
  @swagger.ApiResponse(new interfaces.response.success())
  async deleteUser(@nestjs.Body() data: taskDeleteUserQueryDTO) {
    const link = await this.getUserLink(data.taskId, data.userId);
    await this.taskService.updateUserLink(link.id, { userId: data.userId, deleteTime: new Date() });
    return httpAnswer.OK;
  }

  @nestjs.Delete('deleteTick')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiBody({ type: taskDeleteTickQueryDTO })
  @swagger.ApiResponse(new interfaces.response.success())
  async deleteTick(@nestjs.Body() data: taskDeleteTickQueryDTO) {
    const hashtag = await this.taskService.getTick(data.taskId, data.tickId);
    if (!hashtag)
      throw new nestjs.BadRequestException(`Tick (id=${data.tickId}) not found for task (id=${data.taskId})`);
    await this.taskService.updateTick(hashtag.id, { deleteTime: new Date() });
    return httpAnswer.OK;
  }

  @nestjs.Delete('deleteHashtag')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiBody({ type: taskDeleteHashtagQueryDTO })
  @swagger.ApiResponse(new interfaces.response.success())
  async deleteHashtag(@nestjs.Body() data: taskDeleteHashtagQueryDTO) {
    const hashtag = await this.taskService.getHashtag(data.taskId, data.name);
    if (!hashtag)
      throw new nestjs.BadRequestException(`Hashtag (name=${data.name}) not found for task (id=${data.taskId})`);
    await this.taskService.updateHashtag(hashtag.id, { deleteTime: new Date() });
    return httpAnswer.OK;
  }
}
