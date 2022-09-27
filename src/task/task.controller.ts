import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify-multipart';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, types, exception, httpAnswer, interceptors } from '../globalImport';

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
  taskFullDTO,
  taskUserLinkDTO,
  taskUpdateDTO,
} from './task.dto';

import { TaskService } from './task.service';
import { TaskInstance } from './task.instance';
import { UserController } from '../user/user.controller';
import { UserService } from '../user/user.service';
import { UserInstance } from '../user/user.instance';
import { ProjectService } from '../project/project.service';
import { ProjectController } from '../project/project.controller';
import { ProjectInstance } from '../project/project.instance';
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
    public taskService: TaskService,
    public taskInstance: TaskInstance,
    public userController: UserController,
    private userService: UserService,
    public userInstance: UserInstance,
    public projectController: ProjectController,
    private projectService: ProjectService,
    public projectInstance: ProjectInstance,
    private sessionService: SessionService,
    private utils: UtilsService,
  ) {}

  @nestjs.Post('create')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.created())
  async create(@nestjs.Body() data: taskCreateQueryDTO, @nestjs.Session() session: FastifySession) {
    // !!! кейсы для тестирования: добавление задачи самому себе, добавление задачи самому себе в личный проект, добавление задачи исполнителю, добавление задачи исполнителю в личный проект

    if (!data.taskData) throw new nestjs.BadRequestException('Task data is empty');
    const sessionUserId = await this.sessionService.getUserId(session);
    data.taskData.projectId = data.projectId;
    data.taskData.ownUserId = sessionUserId;
    await this.taskInstance.validateDataForCreate(data.taskData, sessionUserId);

    const task = await this.taskService.create(data.taskData);
    return { ...httpAnswer.OK, data: { id: task.id } };
  }

  @nestjs.Get('getOne')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success({ models: [taskGetOneAnswerDTO] }))
  async getOne(@nestjs.Query() data: taskGetOneQueryDTO, @nestjs.Session() session: FastifySession) {
    const taskId = data.taskId;
    const sessionUserId = await this.sessionService.getUserId(session);
    const task = await this.taskInstance.init(taskId, { consumerId: sessionUserId });

    const result = await this.taskService.getOne({ id: taskId });
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('search')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.search({ model: taskGetOneAnswerDTO }))
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
    if (!data.queryType) throw new nestjs.BadRequestException('Query type is empty');
    if (!data.queryData) throw new nestjs.BadRequestException('Query data is empty');

    const sessionData = await this.sessionService.getState(session);
    const sessionUserId = sessionData.userId;
    const sessionUserCurrentProject = await this.projectInstance.init(sessionData.currentProjectId, sessionUserId);

    data.projectIds = [sessionData.currentProjectId];
    if (sessionData.currentProjectId === sessionData.personalProjectId) {
      const foreignProjectListIds = await sessionUserCurrentProject.consumer.getForeignPersonalProjectList();
      data.projectIds.push(...foreignProjectListIds);
    }

    const sessionUserCurrentProjectLink = sessionUserCurrentProject.getUserLink(sessionUserId);
    data.scheduleFilters = sessionUserCurrentProjectLink.config?.scheduleFilters;

    const result = await this.taskService.getAll(data, sessionUserId);
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('update')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async update(@nestjs.Session() session: FastifySession, @nestjs.Body() data: taskUpdateQueryDTO) {
    const sessionUserId = await this.sessionService.getUserId(session);
    const taskId = data.taskId;
    const task = await this.taskInstance.init(taskId, { consumerId: sessionUserId });
    await task.validateDataForUpdate(data.taskData);

    const ownUserId = task.data.ownUser.userId;
    // изменение startTime/endTime создателем задачи (от всех исполнителей требуется подтверждение приема задачи в работу)
    if (sessionUserId === ownUserId && (data.taskData.startTime || data.taskData.endTime)) {
      for (const { userId } of task.data.userList) {
        if (userId !== sessionUserId) {
          // для создателя задачи повторное подтверждение не требуется
          data.taskData.userList.push({ userId, status: null });
        }
      }
    }
    if (sessionUserId === ownUserId && data.taskData.execEndTime) {
      // удаляем текущих пользователей из задачи
      for (const { userId } of task.data.userList) {
        data.taskData.userList.push({ userId, deleteTime: new Date() });
      }
    }
    // при завершении задачи исполнителем назначаем создателя контролером
    if (data.taskData.execEndTime && task.needPostcontrol()) {
      data.taskData.userList.push({ userId: task.data.ownUser.userId, role: 'control' });
    }
    await this.taskService.update(taskId, data.taskData);
    return httpAnswer.OK;
  }

  @nestjs.Post('execute')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async execute(@nestjs.Session() session: FastifySession, @nestjs.Body() data: taskExecuteQueryDTO) {
    const taskId = data.taskId;
    const sessionUserId = await this.sessionService.getUserId(session);
    const task = await this.taskInstance.init(taskId, { consumerId: sessionUserId });

    const taskStatus = task.getStatus();
    const updateData: taskUpdateDTO = { userList: [] };

    switch (taskStatus) {
      case 'not_in_work':
        if (!task.isMember(sessionUserId))
          throw new nestjs.BadRequestException('Access denied. Expecting task executor confirm.');
        updateData.userList.push({ userId: sessionUserId, status: 'exec_ready' });
        break;
      case 'in_work':
        if (!task.isMember(sessionUserId))
          throw new nestjs.BadRequestException('Access denied. Expecting task executor confirm.');
        updateData.execUserId = sessionUserId;
        updateData.execEndTime = new Date().toISOString();
        if (task.needPostcontrol()) updateData.userList.push({ userId: task.data.ownUser.userId, role: 'control' });
        break;
      case 'on_control':
        if (!task.isOwner(sessionUserId))
          throw new nestjs.BadRequestException('Access denied. Expecting task controller confirm.');
        updateData.userList.push({ userId: sessionUserId, status: 'control_ready' });
        break;
      case 'ready':
        throw new nestjs.BadRequestException('Task closed. No further action expected.');
        break;
    }

    await this.taskService.update(taskId, updateData);
    return httpAnswer.OK;
  }

  @nestjs.Post('updateUserStatus')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async updateUserStatus(@nestjs.Session() session: FastifySession, @nestjs.Body() data: taskUpdateUserStatusQueryDTO) {
    const taskId = data.taskId;
    const sessionUserId = await this.sessionService.getUserId(session);
    if (!data.userId) data.userId = sessionUserId;
    const task = await this.taskInstance.init(taskId, { consumerId: data.userId, allowMemberOnly: true });

    await this.taskService.update(taskId, { userList: [{ userId: data.userId, status: data.status }] });
    return httpAnswer.OK;
  }

  @nestjs.Delete('delete')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async delete(@nestjs.Session() session: FastifySession, @nestjs.Body() data: taskDeleteQueryDTO) {
    const taskId = data.taskId;
    const sessionUserId = await this.sessionService.getUserId(session);
    const task = await this.taskInstance.init(taskId, { consumerId: sessionUserId, allowOwnerOnly: true });

    await this.taskService.update(taskId, { deleteTime: new Date() });
    return httpAnswer.OK;
  }

  @nestjs.Post('restore')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async restore(@nestjs.Session() session: FastifySession, @nestjs.Body() data: taskRestoreQueryDTO) {
    const taskId = data.taskId;
    const sessionUserId = await this.sessionService.getUserId(session);
    const task = await this.taskInstance.init(taskId, {
      consumerId: sessionUserId,
      canBeDeleted: true,
      allowOwnerOnly: true,
    });

    await this.taskService.update(taskId, { deleteTime: null });
    return httpAnswer.OK;
  }

  @nestjs.Post('resetUsers')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async resetUserList(@nestjs.Session() session: FastifySession, @nestjs.Body() data: taskResetUsersQueryDTO) {
    const taskId = data.taskId;
    const sessionUserId = await this.sessionService.getUserId(session);

    const task = await this.taskInstance.init(taskId, { consumerId: sessionUserId, allowOwnerOnly: true });
    await task.validateDataForUpdate(data.taskData);

    // удаляем текущих пользователей из задачи (если они отсутствуют в обновленном списке)
    for (const { userId } of task.data.userList) {
      if (!data.taskData.userList.find((link) => link.userId === userId)) {
        data.taskData.userList.push({ userId, deleteTime: new Date() });
      }
    }
    await this.taskService.update(taskId, data.taskData);
    return httpAnswer.OK;
  }

  @nestjs.Delete('deleteUser')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async deleteUser(@nestjs.Session() session: FastifySession, @nestjs.Body() data: taskDeleteUserQueryDTO) {
    const taskId = data.taskId;
    const sessionUserId = await this.sessionService.getUserId(session);
    const task = await this.taskInstance.init(taskId, { consumerId: sessionUserId, allowOwnerOnly: true });
    if (!task.isMember(data.userId)) {
      throw new nestjs.BadRequestException(`Task (id=${taskId}) not found for user (id=${data.userId})`);
    }

    await this.taskService.update(taskId, { userList: [{ userId: data.userId, deleteTime: new Date() }] });
    return httpAnswer.OK;
  }

  @nestjs.Delete('deleteTick')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async deleteTick(@nestjs.Session() session: FastifySession, @nestjs.Body() data: taskDeleteTickQueryDTO) {
    const taskId = data.taskId;
    const sessionUserId = await this.sessionService.getUserId(session);
    const task = await this.taskInstance.init(taskId, { consumerId: sessionUserId, allowOwnerOnly: true });
    const tick = await this.taskService.getTick(taskId, data.tickId);
    if (!tick) throw new nestjs.BadRequestException(`Tick (id=${data.tickId}) not found for task (id=${taskId})`);

    await this.taskService.updateTick(tick.id, { deleteTime: new Date() });
    return httpAnswer.OK;
  }

  @nestjs.Delete('deleteHashtag')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async deleteHashtag(@nestjs.Session() session: FastifySession, @nestjs.Body() data: taskDeleteHashtagQueryDTO) {
    const taskId = data.taskId;
    const sessionUserId = await this.sessionService.getUserId(session);
    const task = await this.taskInstance.init(taskId, { consumerId: sessionUserId, allowOwnerOnly: true });
    const hashtag = await this.taskService.getHashtag(taskId, data.name);
    if (!hashtag) throw new nestjs.BadRequestException(`Hashtag (name=${data.name}) not found for task (id=${taskId})`);

    await this.taskService.updateHashtag(hashtag.id, { deleteTime: new Date() });
    return httpAnswer.OK;
  }

  @nestjs.Get('handleCron')
  async handleCron(@nestjs.Query() data) {
    //this.taskService.checkForDeleteFinished();
    this.taskService.cronCreateRegularTaskClones();
  }
}
