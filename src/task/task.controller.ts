import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify-multipart';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types, exception, httpAnswer, interceptors } from '../globalImport';

import {
  taskCreateQueryDTO,
  taskUpdateQueryDTO,
  taskExecuteQueryDTO,
  taskUpdateUserStatusQueryDTO,
  taskDeleteQueryDTO,
  taskRestoreQueryDTO,
  taskResetUsersQueryDTO,
  taskDeleteUserQueryDTO,
  taskDeleteTickQueryDTO,
  taskDeleteHashtagQueryDTO,
  taskGetOneQueryDTO,
  taskGetOneAnswerDTO,
  taskGetAllAnswerDTO,
  taskSearchAnswerDTO,
  taskGetAllQueryDTO,
  taskGetAllQueryInboxDTO,
  taskGetAllQueryScheduleDTO,
  taskGetAllQueryOverdueDTO,
  taskGetAllQueryLaterDTO,
  taskGetAllQueryExecutorsDTO,
  taskGetAllQuerySwaggerI,
  taskSearchQueryDTO,
  taskUserLinkFullDTO,
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
@swagger.ApiExtraModels(
  taskGetOneAnswerDTO,
  taskGetAllAnswerDTO,
  taskSearchAnswerDTO,
  taskGetAllQueryInboxDTO,
  taskGetAllQueryScheduleDTO,
  taskGetAllQueryOverdueDTO,
  taskGetAllQueryLaterDTO,
  taskGetAllQueryExecutorsDTO,
)
export class TaskController {
  constructor(
    private taskService: TaskService,
    private userService: UserService,
    private projectService: ProjectService,
    private sessionService: SessionService,
    private utils: UtilsService,
  ) {}

  async validateAndReturnTask(taskId: number, userId: number, config: { canBeDeleted?: boolean } = {}) {
    const task = await this.taskService.getOne(
      { id: taskId },
      { attributes: ['task."id"', 'task."projectId"', 'task."ownUserId"'], canBeDeleted: config.canBeDeleted },
    );
    if (!task) throw new nestjs.BadRequestException(`Task (id=${taskId}) not exist`);
    const userLink = await this.taskService.getUserLink(taskId, userId);
    if (!userLink && task.ownUserId !== userId)
      throw new nestjs.BadRequestException(`Task (id=${taskId}) not found for user (id=${userId})`);
    return { ...task, userLink };
  }

  @nestjs.Post('create')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.created())
  async create(@nestjs.Body() data: taskCreateQueryDTO, @nestjs.Session() session: FastifySession) {
    const projectId = data.projectId;
    if (!data.taskData) data.taskData = {};
    if (!data.taskData.userList) data.taskData.userList = [];

    if (!projectId) throw new nestjs.BadRequestException('Project ID is empty');
    if (!data.taskData.userList.length) throw new nestjs.BadRequestException('User list is empty');
    const projectExists = await this.projectService.checkExists(projectId);
    if (!projectExists) throw new nestjs.BadRequestException('Project does not exist');
    const userId = await this.sessionService.getUserId(session);
    const userLink = await this.projectService.getUserLink(userId, projectId, {
      attributes: ['id', 'role', '"userId"', 'personal'],
    });
    if (!userLink)
      throw new nestjs.BadRequestException(`User (id=${userId}) is not a member of project (id=${projectId}).`);

    const personalOwnerId = await this.projectService.getPersonalOwner(projectId);
    if (personalOwnerId && personalOwnerId != userLink.userId) {
      throw new nestjs.BadRequestException(
        `User (id=${userLink.userId}) is not owner of personal project (id=${projectId}).`,
      );
    }

    data.taskData.ownUserId = userId;
    for (const link of data.taskData.userList) {
      const userLink = await this.projectService.getUserLink(link.userId, data.projectId, { attributes: ['id'] });
      if (!userLink)
        throw new nestjs.BadRequestException(
          `User (id=${link.userId}) is not a member of project (id=${data.projectId}).`,
        );

      if (personalOwnerId) {
        const personalLinksExists = await this.userService.checkMutualPersonalLinksExists(link.userId, userId);
        if (!personalLinksExists)
          throw new nestjs.BadRequestException(`User (id=${userId}) is not in user (id=${link.userId}) contact list.`);
      }

      if (!link.role) link.role = 'exec';
      if (!link.status && link.userId === userId) link.status = 'exec_ready';
    }
    const task = await this.taskService.create(data.projectId, data.taskData).catch(exception.dbErrorCatcher);
    return { ...httpAnswer.OK, data: { id: task.id } };
  }

  @nestjs.Get('getOne')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success({ models: [taskGetOneAnswerDTO] }))
  async getOne(@nestjs.Query() data: taskGetOneQueryDTO, @nestjs.Session() session: FastifySession) {
    if (!data?.taskId) throw new nestjs.BadRequestException('Task ID is empty');
    const userId = await this.sessionService.getUserId(session);
    const task = await this.validateAndReturnTask(data.taskId, userId);

    const result = await this.taskService.getOne({ id: data.taskId, userId });
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('search')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.search({ model: taskSearchAnswerDTO }))
  async search(@nestjs.Body() data: taskSearchQueryDTO, @nestjs.Session() session: FastifySession) {
    if (!data.query || data.query.length < 3) throw new nestjs.BadRequestException('Query is empty or too short');
    if (data.limit === undefined || data.offset === undefined)
      throw new nestjs.BadRequestException('Limit and offset must be defined');
    const sessionData = await this.sessionService.getState(session);
    data.userId = sessionData.userId;
    data.projectId = sessionData.currentProjectId;
    const result = await this.taskService.search(data);
    return { ...httpAnswer.OK, data: { resultList: result.data, endOfList: result.endOfList } };
  }

  @nestjs.Post('getAll')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiBody(new taskGetAllQuerySwaggerI())
  @swagger.ApiResponse(new interfaces.response.search({ model: taskGetOneAnswerDTO }))
  async getAll(@nestjs.Body() data: taskGetAllQueryDTO, @nestjs.Session() session: FastifySession) {
    const sessionData = await this.sessionService.getState(session);
    const userId = sessionData.userId;
    data.projectIds = [sessionData.currentProjectId];
    if (sessionData.currentProjectId === sessionData.personalProjectId) {
      const user = await this.userService.getOne({ id: userId }, { attributes: ['config'] });
      data.projectIds.push(...(user.config.showProjectsInPersonal || []));
      const foreignProjectList = await this.userService.getForeignPersonalProjectList(userId);
      data.projectIds.push(...foreignProjectList.map((project: { id: number }) => project.id));
    }
    const result = await this.taskService.getAll(data, userId);
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('update')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async update(@nestjs.Session() session: FastifySession, @nestjs.Body() data: taskUpdateQueryDTO) {
    if (!data.taskData) data.taskData = {};
    if (!data.taskData.userList) data.taskData.userList = [];
    const userId = await this.sessionService.getUserId(session);
    const task = await this.validateAndReturnTask(data.taskId, userId);

    // проверка обновления связей задача-пользователь
    for (const link of data.taskData.userList) {
      const userLink = await this.projectService.getUserLink(link.userId, task.projectId, { attributes: ['id'] });
      if (!userLink)
        throw new nestjs.BadRequestException(
          `User (id=${link.userId}) is not a member of project (id=${task.projectId}).`,
        );

      // дефолтные значения для связи
      if (!link.role) link.role = 'exec';
      if (!link.status && link.userId === userId) link.status = 'exec_ready';
    }

    // изменение startTime/endTime создателем задачи (от всех исполнителей требуется подтверждение приема задачи в работу)
    if (userId === task.ownUserId && (data.taskData.startTime !== undefined || data.taskData.endTime !== undefined)) {
      const { userList = [] } = await this.taskService.getOne({ id: data.taskId });
      for (const link of userList) {
        if (link.userId !== userId) {
          // для создателя задачи повторное подтверждение не требуется
          data.taskData.userList.push({ userId: link.userId, status: null });
        }
      }
    }
    // при завершении задачи исполнителем назначаем создателя контролером
    if (data.taskData.execEndTime) {
      const { userList = [] } = await this.taskService.getOne({ id: data.taskId });
      if (
        userList.filter((link: taskUserLinkFullDTO) => link.role === 'exec').length === 1 &&
        !userList.find((link: taskUserLinkFullDTO) => link.userId === task.ownUserId)
      ) {
        await this.taskService.upsertLinkToUser(data.taskId, task.ownUserId, { role: 'control' });
      }
    }

    await this.taskService.update(data.taskId, data.taskData);

    return httpAnswer.OK;
  }

  @nestjs.Post('execute')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async execute(@nestjs.Session() session: FastifySession, @nestjs.Body() data: taskExecuteQueryDTO) {
    const userId = await this.sessionService.getUserId(session);
    await this.validateAndReturnTask(data.taskId, userId);
    await this.taskService.update(data.taskId, { execUserId: userId, execEndTime: new Date() });
    return httpAnswer.OK;
  }

  @nestjs.Post('updateUserStatus')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async updateUserStatus(@nestjs.Session() session: FastifySession, @nestjs.Body() data: taskUpdateUserStatusQueryDTO) {
    if (!data.userId) data.userId = await this.sessionService.getUserId(session);
    const { userLink } = await this.validateAndReturnTask(data.taskId, data.userId);
    await this.taskService.updateUserLink(userLink.id, { userId: data.userId, status: data.status });
    return httpAnswer.OK;
  }

  @nestjs.Delete('delete')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async delete(@nestjs.Session() session: FastifySession, @nestjs.Body() data: taskDeleteQueryDTO) {
    if (!data.taskId) throw new nestjs.BadRequestException('Task ID is empty');
    const userId = await this.sessionService.getUserId(session);
    await this.validateAndReturnTask(data.taskId, userId);

    await this.taskService.update(data.taskId, { deleteTime: new Date() });
    return httpAnswer.OK;
  }

  @nestjs.Post('restore')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async restore(@nestjs.Session() session: FastifySession, @nestjs.Body() data: taskRestoreQueryDTO) {
    if (!data.taskId) throw new nestjs.BadRequestException('Task ID is empty');
    const userId = await this.sessionService.getUserId(session);
    await this.validateAndReturnTask(data.taskId, userId, { canBeDeleted: true });

    await this.taskService.update(data.taskId, { deleteTime: null });
    return httpAnswer.OK;
  }

  @nestjs.Post('resetUsers')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async resetUserList(@nestjs.Session() session: FastifySession, @nestjs.Body() data: taskResetUsersQueryDTO) {
    if (!data.taskData) data.taskData = {};
    if (!data.taskData.userList) data.taskData.userList = [];

    if (!data.taskId) throw new nestjs.BadRequestException('Task ID is empty');
    if (!data.taskData.userList.length) throw new nestjs.BadRequestException('User list is empty');
    const userId = await this.sessionService.getUserId(session);
    const { projectId, ownUserId } = await this.validateAndReturnTask(data.taskId, userId);
    if (ownUserId !== userId) throw new nestjs.BadRequestException(`User (id=${userId}) is not task owner`);

    const { userList = [] } = await this.taskService.getOne({ id: data.taskId });
    // удаляем текущих пользователей из задачи
    for (const link of userList) {
      await this.taskService.updateUserLink(link.id, { deleteTime: new Date() });
    }
    // добавляем новыех пользователей к задаче
    for (const link of data.taskData.userList) {
      const userLink = await this.projectService.getUserLink(link.userId, projectId, { attributes: ['id'] });
      if (!userLink)
        throw new nestjs.BadRequestException(`User (id=${link.userId}) is not a member of project (id=${projectId}).`);

      if (!link.role) link.role = 'exec';
      if (!link.status && link.userId === userId) link.status = 'exec_ready';
      await this.taskService.upsertLinkToUser(data.taskId, link.userId, link);
    }
    return httpAnswer.OK;
  }

  @nestjs.Delete('deleteUser')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async deleteUser(@nestjs.Body() data: taskDeleteUserQueryDTO) {
    const { userLink } = await this.validateAndReturnTask(data.taskId, data.userId);
    await this.taskService.updateUserLink(userLink.id, { userId: data.userId, deleteTime: new Date() });
    return httpAnswer.OK;
  }

  @nestjs.Delete('deleteTick')
  @nestjs.UseGuards(decorators.isLoggedIn)
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
  @swagger.ApiResponse(new interfaces.response.success())
  async deleteHashtag(@nestjs.Body() data: taskDeleteHashtagQueryDTO) {
    const hashtag = await this.taskService.getHashtag(data.taskId, data.name);
    if (!hashtag)
      throw new nestjs.BadRequestException(`Hashtag (name=${data.name}) not found for task (id=${data.taskId})`);
    await this.taskService.updateHashtag(hashtag.id, { deleteTime: new Date() });
    return httpAnswer.OK;
  }

  @nestjs.Get('handleCron')
  async handleCron(@nestjs.Query() data) {
    this.taskService.checkForDeleteFinished();
  }
}
