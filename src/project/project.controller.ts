import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types, httpAnswer, interceptors } from '../globalImport';

import {
  projectCreateQueryDTO,
  projectUpdateQueryDTO,
  projectUpdateUserQueryDTO,
  projectTransferQueryDTO,
  projectGetOneQueryDTO,
  projectGetOneAnswerDTO,
  projectAddUserQueryDTO,
  projectDeleteUserQueryDTO,
  projectDeleteUserAnswerDTO,
  projectGetOneAnswerUserDTO,
} from './project.dto';

import { ProjectService } from './project.service';
import { ProjectTransferService } from './transfer.service';
import { UserController, UserInstance } from '../user/user.controller';
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
}

@nestjs.Controller('project')
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@nestjs.UseGuards(decorators.validateSession)
@swagger.ApiTags('project')
@swagger.ApiResponse({ status: 400, description: 'Формат ответа для всех ошибок', type: interfaces.response.exception })
@swagger.ApiExtraModels(models.project2user, models.user, projectGetOneAnswerDTO, projectDeleteUserAnswerDTO)
export class ProjectController {
  constructor(
    public projectService: ProjectService,
    private transferService: ProjectTransferService,
    public userController: UserController,
    private userService: UserService,
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
  @swagger.ApiConsumes('multipart/form-data')
  @swagger.ApiResponse(new interfaces.response.success())
  async updateUser(@nestjs.Body() /* @decorators.Multipart() */ data: projectUpdateUserQueryDTO) {
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
}
