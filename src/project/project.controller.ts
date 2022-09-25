import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, types, httpAnswer, interceptors } from '../globalImport';

import * as fs from 'fs';

import {
  projectCreateQueryDTO,
  projectUpdateQueryDTO,
  projectUpdateUserQueryDTO,
  projectUpdateUserWithFormdataQueryDTO,
  projectTransferQueryDTO,
  projectGetOneQueryDTO,
  projectGetOneAnswerDTO,
  projectAddUserQueryDTO,
  projectDeleteUserQueryDTO,
  projectDeleteUserAnswerDTO,
  projectGetOneAnswerUserDTO,
} from './project.dto';

import {
  taskGetAllQueryDTO,
  taskGetOneAnswerDTO,
  taskGetAllQuerySwaggerI,
  taskInboxQueryDataDTO,
  taskScheduleQueryDataDTO,
  taskOverdueQueryDataDTO,
  taskLaterQueryDataDTO,
  taskExecutorsQueryDataDTO,
} from '../task/task.dto';

import { ProjectService } from './project.service';
import { ProjectTransferService } from './transfer.service';
import { UserController, UserInstance } from '../user/user.controller';
import { TaskService } from '../task/task.service';
import { UserService } from '../user/user.service';
import { SessionService } from '../session/session.service';
import { FileService } from '../file/file.service';
import { UtilsService } from '../utils/utils.service';

export class ProjectInstance {
  id: number;
  ctx: ProjectController;
  data: projectGetOneAnswerDTO;
  consumer: UserInstance;
  constructor(ctx: ProjectController) {
    this.ctx = ctx;
  }
  async init(projectId: number, consumerId: number) {
    if (!projectId) throw new nestjs.BadRequestException('Project ID is empty');
    this.id = projectId;
    this.data = await this.ctx.projectService.getOne({ id: projectId });
    if (!this.data) throw new nestjs.BadRequestException(`Project (id=${projectId}) does not exist`);

    if (consumerId) {
      if (!this.isMember(consumerId)) {
        throw new nestjs.BadRequestException(`User (id=${consumerId}) is not a member of project (id=${this.id})`);
      }
      this.consumer = await new UserInstance(this.ctx.userController).init(consumerId);
    }
    return this;
  }
  isPersonal() {
    return this.data.personal;
  }
  isMember(userId: number) {
    return this.data.userList.find((userLink) => userLink.userId === userId) ? true : false;
  }
  isOwner(userId: number) {
    return this.data.userList.find((userLink) => userLink.userId === userId && userLink.role === 'owner')
      ? true
      : false;
  }
  getUserLink(userId: number) {
    return this.data.userList.find((link) => link.userId === userId);
  }
  async fillGetTasksQuery(queryData, sessionData) {
    const projectIds = [this.id];
    if (this.id === sessionData.personalProjectId) {
      const foreignProjectList = await this.ctx.userService.getForeignPersonalProjectList(this.consumer.id);
      projectIds.push(...foreignProjectList.map((project: { id: number }) => project.id));
    }

    const sessionUserCurrentProjectLink = this.getUserLink(this.consumer.id);
    const scheduleFilters = sessionUserCurrentProjectLink.config?.scheduleFilters;

    return { ...queryData, projectIds, scheduleFilters };
  }
}

@nestjs.Controller('project')
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@nestjs.UseGuards(decorators.validateSession)
@swagger.ApiTags('project')
@swagger.ApiResponse({ status: 400, description: 'Формат ответа для всех ошибок', type: interfaces.response.exception })
@swagger.ApiExtraModels(projectGetOneAnswerDTO, projectDeleteUserAnswerDTO)
export class ProjectController {
  constructor(
    public projectService: ProjectService,
    private transferService: ProjectTransferService,
    public userController: UserController,
    public userService: UserService,
    private taskService: TaskService,
    private sessionService: SessionService,
    private fileService: FileService,
    private utils: UtilsService,
  ) {}

  async validateUserLinkAndReturn(id: number, data: { userId?: number; session?: FastifySession }) {
    if (!id) throw new nestjs.BadRequestException('Project ID is empty');
    const userId = data.userId || (await this.sessionService.getUserId(data.session));
    const userLink = await this.projectService.getUserLink(userId, id, {
      attributes: ['id', 'role', '"userId"', 'personal'],
    });
    if (!userLink) throw new nestjs.BadRequestException(`User (id=${userId}) is not a member of project (id=${id}).`);
    return userLink;
  }

  @nestjs.Post('create')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.created())
  async create(@nestjs.Body() projectData: projectCreateQueryDTO, @nestjs.Session() session: FastifySession) {
    const userId = await this.sessionService.getUserId(session);
    if (!projectData.userList) projectData.userList = [];
    if (!projectData.userList.find((item) => item.userId === userId)) {
      projectData.userList.push({ userId, role: 'owner' });
    }
    const project = await this.projectService.create(projectData);
    return { ...httpAnswer.OK, data: { id: project.id } };
  }

  @nestjs.Get('getOne')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success({ models: [projectGetOneAnswerDTO] }))
  async getOne(@nestjs.Query() data: projectGetOneQueryDTO, @nestjs.Session() session: FastifySession) {
    const projectId = data.projectId;
    const userLink = await this.validateUserLinkAndReturn(projectId, { session });
    const personalOwnerId = await this.projectService.getPersonalOwner(projectId);
    if (personalOwnerId && personalOwnerId != userLink.userId)
      throw new nestjs.BadRequestException(
        `User (id=${userLink.userId}) is not owner of personal project (id=${projectId}).`,
      );

    const userId = await this.sessionService.getUserId(session);
    const result = await this.projectService.getOne({ id: projectId, userId });
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('update')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async update(@nestjs.Body() data: projectUpdateQueryDTO, @nestjs.Session() session: FastifySession) {
    const projectId = data.projectId;
    await this.validateUserLinkAndReturn(projectId, { session });

    const personalOwnerId = await this.projectService.getPersonalOwner(projectId);
    if (personalOwnerId) {
      for (const key of Object.keys(data.projectData)) {
        if (['title', 'personal'].includes(key)) {
          throw new nestjs.BadRequestException(
            `Access denied to change key ("${key}") of personal project (id=${projectId}).`,
          );
        }
      }
    }
    await this.projectService.update(projectId, data.projectData);
    return httpAnswer.OK;
  }

  @nestjs.Post('transfer')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async transfer(@nestjs.Body() data: projectTransferQueryDTO, @nestjs.Session() session: FastifySession) {
    const projectId = data.projectId;
    const toUserId = data.userId;

    if (!projectId) throw new nestjs.BadRequestException('Project ID is empty');
    if (!toUserId) throw new nestjs.BadRequestException('User ID is empty');

    const toUserLink = await this.validateUserLinkAndReturn(projectId, { userId: toUserId });
    const fromUserLink = await this.validateUserLinkAndReturn(projectId, { session });
    if (!fromUserLink)
      throw new nestjs.BadRequestException(
        `User (id=${fromUserLink.userId}) is not a member of project (id=${projectId}).`,
      );
    if (fromUserLink.personal) throw new nestjs.BadRequestException('Access denied to delete personal project');
    if (fromUserLink.role != 'owner')
      throw new nestjs.BadRequestException(`User (id=${fromUserLink.userId}) is not project owner.`);

    await this.transferService.execute({ projectId, toUserLink, fromUserLink });

    const sessionState = await this.sessionService.getState(session);
    if (projectId !== sessionState.currentProjectId) {
      return httpAnswer.OK;
    } else {
      const user = await this.userService.getOne({ id: fromUserLink.userId });
      const personalProject = user.projectList.find((project) => project.personal);
      const redirectProjectId = personalProject.projectId;
      await this.userService.update(user.id, { config: { currentProjectId: redirectProjectId } });
      await this.sessionService.updateStorageById(session.storageId, { currentProjectId: redirectProjectId });
      return { ...httpAnswer.OK, data: { redirectProjectId } };
    }
  }

  @nestjs.Post('updateUser')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async updateUser(@nestjs.Body() data: projectUpdateUserQueryDTO) {
    const projectId = data.projectId;
    const userId = data.userId;
    if (!projectId) throw new nestjs.BadRequestException('Project ID is empty');
    if (!userId) throw new nestjs.BadRequestException('User ID is empty');
    const userLink = await this.validateUserLinkAndReturn(projectId, { userId });

    if (data.iconFile) {
      if (!data.iconFile?.fileContent?.length) throw new nestjs.BadRequestException({ msg: 'File content is empty' });
      if (data.iconFile.fileContent.includes(';base64,')) {
        const fileContent = data.iconFile.fileContent.split(';base64,');
        data.iconFile.fileContent = fileContent[1];
        if (!data.iconFile.fileMimetype) data.iconFile.fileMimetype = fileContent[0].replace('data:', '');
      }
      if (!data.iconFile.fileMimetype) throw new nestjs.BadRequestException({ msg: 'File mime-type is empty' });
    }

    const updateData: { userId: number; userName?: string; position?: string } = { userId };
    if (data.userName !== undefined) updateData.userName = data.userName;
    if (data.position !== undefined) updateData.position = data.position;
    await this.projectService.update(projectId, { userList: [updateData] });

    if (data.iconFile) {
      if (!data.iconFile.fileExtension) data.iconFile.fileExtension = (data.iconFile.fileName || '').split('.').pop();
      if (!data.iconFile.fileName)
        data.iconFile.fileName =
          ((Date.now() % 10000000) + Math.random()).toString() + '.' + data.iconFile.fileExtension;
      data.iconFile.link = './uploads/' + data.iconFile.fileName;
      await fs.promises.writeFile(data.iconFile.link, Buffer.from(data.iconFile.fileContent, 'base64'));

      await this.fileService.create(
        Object.assign(data.iconFile, {
          parentType: 'project_to_user',
          parentId: userLink.id,
          fileType: 'icon',
        }),
      );
    }
    return httpAnswer.OK;
  }

  @nestjs.Post('updateUserWithFormdata')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiConsumes('multipart/form-data')
  @swagger.ApiResponse(new interfaces.response.success())
  async updateUserWithFormdata(@nestjs.Body() @decorators.Multipart() data: projectUpdateUserWithFormdataQueryDTO) {
    const projectId = data.projectId;
    const userId = data.userId;
    if (!projectId) throw new nestjs.BadRequestException('Project ID is empty');
    if (!userId) throw new nestjs.BadRequestException('User ID is empty');
    const userLink = await this.validateUserLinkAndReturn(projectId, { userId });

    const updateData: { userId: number; userName?: string; position?: string } = { userId };
    if (data.userName !== undefined) updateData.userName = data.userName;
    if (data.position !== undefined) updateData.position = data.position;
    await this.projectService.update(projectId, { userList: [updateData] });
    if (data.iconFile) {
      data.iconFile.parentType = 'project_to_user';
      data.iconFile.parentId = userLink.id;
      data.iconFile.fileType = 'icon';
      await this.fileService.create(data.iconFile);
    }
    return httpAnswer.OK;
  }

  @nestjs.Post('addUser')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async addUser(@nestjs.Body() data: projectAddUserQueryDTO, @nestjs.Session() session: FastifySession) {
    const projectId = data.projectId;
    const userId = data.userId;
    if (!userId) throw new nestjs.BadRequestException('User ID is empty');
    await this.userService.checkExists(userId);
    const userExist = await this.userService.checkExists(userId);
    if (!userExist) throw new nestjs.BadRequestException(`User (id=${userId}) does not exist`);
    const userLink = await this.validateUserLinkAndReturn(projectId, { session });
    const personalOwnerId = await this.projectService.getPersonalOwner(projectId);
    if (personalOwnerId && personalOwnerId != userLink.userId)
      throw new nestjs.BadRequestException(
        `User (id=${userLink.userId}) is not owner of personal project (id=${projectId}).`,
      );

    await this.projectService.update(projectId, {
      userList: [{ role: 'member', userId, position: data.position, userName: data.userName }],
    });
    return httpAnswer.OK;
  }

  @nestjs.Delete('deleteUser')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success({ models: [projectDeleteUserAnswerDTO] }))
  async deleteUser(@nestjs.Body() data: projectDeleteUserQueryDTO, @nestjs.Session() session: FastifySession) {
    const projectId = data.projectId;
    const userId = data.userId;
    const userLink = await this.validateUserLinkAndReturn(projectId, { userId });

    if (userLink.personal) throw new nestjs.BadRequestException('Access denied to delete personal project');
    if (userLink.role === 'owner')
      throw new nestjs.BadRequestException(
        `Invalid action. User (id=${userId}) is project owner (transfer project first).`,
      );
    await this.projectService.updateUserLink(userLink.id, { deleteTime: new Date() });

    const sessionState = await this.sessionService.getState(session);
    if (projectId !== sessionState.currentProjectId) {
      return httpAnswer.OK;
    } else {
      const user = await this.userService.getOne({ id: userId });
      const personalProject = user.projectList.find((project) => project.personal);
      const redirectProjectId = personalProject.projectId;
      await this.userService.update(userId, { config: { currentProjectId: redirectProjectId } });
      await this.sessionService.updateStorageById(session.storageId, { currentProjectId: redirectProjectId });
      return { ...httpAnswer.OK, data: { redirectProjectId } };
    }
  }

  @nestjs.Post('getInboxTasks')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.search({ model: taskGetOneAnswerDTO }))
  async getInboxTasks(@nestjs.Body() data: taskInboxQueryDataDTO, @nestjs.Session() session: FastifySession) {
    if (!data.filter) throw new nestjs.BadRequestException('Attribute "filter" is empty');
    const sessionData = await this.sessionService.getState(session);
    const sessionUserId = sessionData.userId;
    const sessionUserCurrentProject = await new ProjectInstance(this).init(sessionData.currentProjectId, sessionUserId);
    const filledQuery = await sessionUserCurrentProject.fillGetTasksQuery(data, sessionData);
    const result = await this.taskService.getInboxTasks(sessionUserId, filledQuery);
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('getScheduleTasks')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.search({ model: taskGetOneAnswerDTO }))
  async getScheduleTasks(@nestjs.Body() data: taskScheduleQueryDataDTO, @nestjs.Session() session: FastifySession) {
    if (!data.from) throw new nestjs.BadRequestException('Attribute "from" is empty');
    if (!data.to) throw new nestjs.BadRequestException('Attribute "to" is empty');
    const sessionData = await this.sessionService.getState(session);
    const sessionUserId = sessionData.userId;
    const sessionUserCurrentProject = await new ProjectInstance(this).init(sessionData.currentProjectId, sessionUserId);
    const filledQuery = await sessionUserCurrentProject.fillGetTasksQuery(data, sessionData);
    const result = await this.taskService.getScheduleTasks(sessionUserId, filledQuery);
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('getOverdueTasks')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.search({ model: taskGetOneAnswerDTO }))
  async getOverdueTasks(@nestjs.Body() data: taskOverdueQueryDataDTO, @nestjs.Session() session: FastifySession) {
    const sessionData = await this.sessionService.getState(session);
    const sessionUserId = sessionData.userId;
    const sessionUserCurrentProject = await new ProjectInstance(this).init(sessionData.currentProjectId, sessionUserId);
    const filledQuery = await sessionUserCurrentProject.fillGetTasksQuery(data, sessionData);
    const result = await this.taskService.getOverdueTasks(sessionUserId, filledQuery);
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('getLaterTasks')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.search({ model: taskGetOneAnswerDTO }))
  async getLaterTasks(@nestjs.Body() data: taskLaterQueryDataDTO, @nestjs.Session() session: FastifySession) {
    const sessionData = await this.sessionService.getState(session);
    const sessionUserId = sessionData.userId;
    const sessionUserCurrentProject = await new ProjectInstance(this).init(sessionData.currentProjectId, sessionUserId);
    const filledQuery = await sessionUserCurrentProject.fillGetTasksQuery(data, sessionData);
    const result = await this.taskService.getLaterTasks(sessionUserId, filledQuery);
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('getExecutorsTasks')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.search({ model: taskGetOneAnswerDTO }))
  async getExecutorsTasks(@nestjs.Body() data: taskExecutorsQueryDataDTO, @nestjs.Session() session: FastifySession) {
    const sessionData = await this.sessionService.getState(session);
    const sessionUserId = sessionData.userId;
    const sessionUserCurrentProject = await new ProjectInstance(this).init(sessionData.currentProjectId, sessionUserId);
    const filledQuery = await sessionUserCurrentProject.fillGetTasksQuery(data, sessionData);
    const result = await this.taskService.getExecutorsTasks(sessionUserId, filledQuery);
    return { ...httpAnswer.OK, data: result };
  }
}
