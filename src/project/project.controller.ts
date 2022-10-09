import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, types, httpAnswer, interceptors } from '../globalImport';

import {
  projectCreateQueryDTO,
  projectUpdateQueryDTO,
  projectUpdateWithFormdataQueryDTO,
  projectUpdateUserQueryDTO,
  projectUpdateUserWithFormdataQueryDTO,
  projectTransferQueryDTO,
  projectGetOneQueryDTO,
  projectGetOneAnswerDTO,
  projectAddUserQueryDTO,
  projectDeleteUserQueryDTO,
  projectDeleteUserAnswerDTO,
  projectGetOneAnswerUserDTO,
  projectUserLinkDTO,
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
import { fileDTO, fileCreateDTO, fileUploadQueryFileDTO, uploadedFileDTO } from '../file/file.dto';

import { ProjectService } from './project.service';
import { ProjectInstance } from './project.instance';
import { UserController } from '../user/user.controller';
import { TaskService } from '../task/task.service';
import { UserService } from '../user/user.service';
import { UserInstance } from '../user/user.instance';
import { SessionService } from '../session/session.service';
import { FileService } from '../file/file.service';
import { FileInstance } from '../file/file.instance';
import { UtilsService } from '../utils/utils.service';

@nestjs.Controller('project')
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@nestjs.UseGuards(decorators.validateSession)
@swagger.ApiTags('project')
@swagger.ApiResponse({ status: 400, description: 'Формат ответа для всех ошибок', type: interfaces.response.exception })
@swagger.ApiExtraModels(projectGetOneAnswerDTO, projectDeleteUserAnswerDTO, uploadedFileDTO)
export class ProjectController {
  constructor(
    public projectService: ProjectService,
    public projectInstance: ProjectInstance,
    public userController: UserController,
    public userService: UserService,
    public userInstance: UserInstance,
    private taskService: TaskService,
    private sessionService: SessionService,
    private fileService: FileService,
    private fileInstance: FileInstance,
    private utils: UtilsService,
  ) {}

  @nestjs.Post('create')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.created())
  async create(@nestjs.Body() projectData: projectCreateQueryDTO, @nestjs.Session() session: FastifySession) {
    const userId = session.userId;
    if (!projectData.userList) projectData.userList = [];
    // !!! тут ошибка, если у item.userId === userId не указана role (надо перенести в projectInstance - добавить validateDataForCreate)
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
    const project = await this.projectInstance.init(projectId);
    const sessionUserId = session.userId;
    project.checkPersonalAccess(sessionUserId);

    const result = await this.projectService.getOne({ id: projectId, userId: sessionUserId });
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('update')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success({ models: [uploadedFileDTO] }))
  async update(@nestjs.Body() data: projectUpdateQueryDTO, @nestjs.Session() session: FastifySession) {
    if (!data.projectData) data.projectData = {};
    const projectId = data.projectId;
    const project = await this.projectInstance.init(projectId);
    const sessionUserId = session.userId;
    project.checkPersonalAccess(sessionUserId);
    project.validateDataForUpdate(data.projectData);

    if (data.iconFile !== undefined) {
      if (data.iconFile === null) {
        data.projectData.iconFile = null;
      } else {
        data.projectData.iconFile = await this.fileInstance.uploadAndGetDataFromBase64(data.iconFile);
      }
    }
    const {
      uploadedFile: { id: uploadedFileId },
    } = await this.projectService.update(projectId, data.projectData);

    return { ...httpAnswer.OK, data: { uploadedFileId } };
  }

  @nestjs.Post('updateWithFormdata')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiConsumes('multipart/form-data')
  @swagger.ApiResponse(new interfaces.response.success({ models: [uploadedFileDTO] }))
  async updateWithFormdata(
    @nestjs.Body() data: projectUpdateWithFormdataQueryDTO, // без @nestjs.Body() не будет работать swagger
    @nestjs.Session() session: FastifySession,
  ) {
    if (!data.projectData) data.projectData = {};
    const projectId = data.projectId;
    const project = await this.projectInstance.init(projectId);
    const sessionUserId = session.userId;
    project.checkPersonalAccess(sessionUserId);
    project.validateDataForUpdate(data.projectData);

    data.projectData.iconFile = data.iconFile;
    const {
      uploadedFile: { id: uploadedFileId },
    } = await this.projectService.update(projectId, data.projectData);

    return { ...httpAnswer.OK, data: { uploadedFileId } };
  }

  @nestjs.Post('transfer')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async transfer(@nestjs.Body() data: projectTransferQueryDTO, @nestjs.Session() session: FastifySession) {
    const projectId = data.projectId;
    const toUserId = data.userId;
    if (!toUserId) throw new nestjs.BadRequestException('User ID is empty');
    const sessionUserId = session.userId;
    const project = await this.projectInstance.init(projectId, sessionUserId);
    if (project.isPersonal())
      throw new nestjs.BadRequestException(`Access denied to transfer personal project (id=${projectId})`);
    if (!project.isOwner(sessionUserId))
      throw new nestjs.BadRequestException(`User (id=${sessionUserId}) is not owner of project (id=${projectId}).`);
    project.checkIsMember(toUserId);

    await this.projectService.transfer({
      projectId,
      fromUserId: sessionUserId,
      toUserId,
      fromUserLinkId: project.getUserLink(sessionUserId).projectToUserLinkId,
      toUserLinkId: project.getUserLink(toUserId).projectToUserLinkId,
    });

    return httpAnswer.OK;
  }

  @nestjs.Post('updateUser')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success({ models: [uploadedFileDTO] }))
  async updateUser(@nestjs.Body() data: projectUpdateUserQueryDTO, @nestjs.Session() session: FastifySession) {
    const projectId = data.projectId;
    const userId = data.userId;
    if (!userId) throw new nestjs.BadRequestException('User ID is empty');
    const project = await this.projectInstance.init(projectId, userId);
    const sessionUserId = session.userId;
    project.checkPersonalAccess(sessionUserId);

    const updateData: { userId?: number; userName?: string; position?: string; userIconFile?: fileCreateDTO } = {};
    updateData.userId = userId;
    if (data.userName !== undefined) updateData.userName = data.userName;
    if (data.position !== undefined) updateData.position = data.position;

    if (data.iconFile !== undefined) {
      if (data.iconFile === null) {
        updateData.userIconFile = null;
      } else {
        updateData.userIconFile = await this.fileInstance.uploadAndGetDataFromBase64(data.iconFile);
      }
    }
    const {
      uploadedFile: { id: uploadedFileId },
    } = await this.projectService.updateUserLink(project.getUserLink(userId).projectToUserLinkId, updateData);

    return { ...httpAnswer.OK, data: { uploadedFileId } };
  }

  @nestjs.Post('updateUserWithFormdata')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiConsumes('multipart/form-data')
  @swagger.ApiResponse(new interfaces.response.success({ models: [uploadedFileDTO] }))
  async updateUserWithFormdata(
    @nestjs.Body() data: projectUpdateUserWithFormdataQueryDTO,
    @nestjs.Session() session: FastifySession,
  ) {
    const projectId = parseInt(data.projectId);
    const userId = parseInt(data.userId);
    if (!userId) throw new nestjs.BadRequestException('User ID is empty');
    const project = await this.projectInstance.init(projectId, userId);
    const sessionUserId = session.userId;
    project.checkPersonalAccess(sessionUserId);

    const updateData: { userId?: number; userName?: string; position?: string; userIconFile?: fileCreateDTO } = {};
    updateData.userId = userId;
    if (data.userName !== undefined) updateData.userName = data.userName;
    if (data.position !== undefined) updateData.position = data.position;
    updateData.userIconFile = data.iconFile;
    const {
      uploadedFile: { id: uploadedFileId },
    } = await this.projectService.updateUserLink(project.getUserLink(userId).projectToUserLinkId, updateData);

    return { ...httpAnswer.OK, data: { uploadedFileId } };
  }

  @nestjs.Post('addUser')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async addUser(@nestjs.Body() data: projectAddUserQueryDTO, @nestjs.Session() session: FastifySession) {
    const projectId = data.projectId;
    const userId = data.userId;
    await this.userInstance.init(userId);
    const project = await this.projectInstance.init(projectId);
    const sessionUserId = session.userId;
    project.checkPersonalAccess(sessionUserId);

    const updateData: projectUserLinkDTO = { userId, position: data.position, userName: data.userName };
    if (!project.getUserLink(userId)) updateData.role = 'member';
    await this.projectService.update(projectId, { userList: [updateData] });

    return httpAnswer.OK;
  }

  @nestjs.Delete('deleteUser')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success({ models: [projectDeleteUserAnswerDTO] }))
  async deleteUser(@nestjs.Body() data: projectDeleteUserQueryDTO, @nestjs.Session() session: FastifySession) {
    const projectId = data.projectId;
    const userId = data.userId;
    if (!userId) throw new nestjs.BadRequestException('User ID is empty');
    const project = await this.projectInstance.init(projectId, userId);
    const sessionUserId = session.userId;
    project.checkPersonalAccess(sessionUserId);
    if (project.isPersonal()) throw new nestjs.BadRequestException('Access denied to delete personal project');
    if (project.isOwner(userId))
      throw new nestjs.BadRequestException(
        `Invalid action. User (id=${userId}) is project owner (transfer project first).`,
      );

    await project.consumer.switchProject(null, {
      switchToProjectId: project.consumer.data.config.personalProjectId,
      switchFromProjectId: projectId,
    });
    await this.projectService.deleteUserWithTasks({
      projectId,
      userId,
      projectToUserLinkId: project.getUserLink(userId).projectToUserLinkId,
    });

    return httpAnswer.OK;
  }

  @nestjs.Post('getInboxTasks')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.search({ model: taskGetOneAnswerDTO }))
  async getInboxTasks(@nestjs.Body() data: taskInboxQueryDataDTO, @nestjs.Session() session: FastifySession) {
    if (!data.filter) throw new nestjs.BadRequestException('Attribute "filter" is empty');
    const sessionData = await this.sessionService.get(session.id);
    const sessionUserId = sessionData.userId;
    const project = await this.projectInstance.init(sessionData.currentProjectId, sessionUserId);
    const filledQuery = await project.fillGetTasksQuery(data, sessionData);
    const result = await this.taskService.getInboxTasks(sessionUserId, filledQuery);
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('getScheduleTasks')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.search({ model: taskGetOneAnswerDTO }))
  async getScheduleTasks(@nestjs.Body() data: taskScheduleQueryDataDTO, @nestjs.Session() session: FastifySession) {
    if (!data.from) throw new nestjs.BadRequestException('Attribute "from" is empty');
    if (!data.to) throw new nestjs.BadRequestException('Attribute "to" is empty');
    const sessionData = await this.sessionService.get(session.id);
    const sessionUserId = sessionData.userId;
    const project = await this.projectInstance.init(sessionData.currentProjectId, sessionUserId);
    const filledQuery = await project.fillGetTasksQuery(data, sessionData);
    const result = await this.taskService.getScheduleTasks(sessionUserId, filledQuery);
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('getOverdueTasks')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.search({ model: taskGetOneAnswerDTO }))
  async getOverdueTasks(@nestjs.Body() data: taskOverdueQueryDataDTO, @nestjs.Session() session: FastifySession) {
    const sessionData = await this.sessionService.get(session.id);
    const sessionUserId = sessionData.userId;
    const project = await this.projectInstance.init(sessionData.currentProjectId, sessionUserId);
    const filledQuery = await project.fillGetTasksQuery(data, sessionData);
    const result = await this.taskService.getOverdueTasks(sessionUserId, filledQuery);
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('getLaterTasks')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.search({ model: taskGetOneAnswerDTO }))
  async getLaterTasks(@nestjs.Body() data: taskLaterQueryDataDTO, @nestjs.Session() session: FastifySession) {
    const sessionData = await this.sessionService.get(session.id);
    const sessionUserId = sessionData.userId;
    const project = await this.projectInstance.init(sessionData.currentProjectId, sessionUserId);
    const filledQuery = await project.fillGetTasksQuery(data, sessionData);
    const result = await this.taskService.getLaterTasks(sessionUserId, filledQuery);
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('getExecutorsTasks')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.search({ model: taskGetOneAnswerDTO }))
  async getExecutorsTasks(@nestjs.Body() data: taskExecutorsQueryDataDTO, @nestjs.Session() session: FastifySession) {
    const sessionData = await this.sessionService.get(session.id);
    const sessionUserId = sessionData.userId;
    const project = await this.projectInstance.init(sessionData.currentProjectId, sessionUserId);
    const filledQuery = await project.fillGetTasksQuery(data, sessionData);
    const result = await this.taskService.getExecutorsTasks(sessionUserId, filledQuery);
    return { ...httpAnswer.OK, data: result };
  }
}
