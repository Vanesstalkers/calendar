import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types, httpAnswer, interceptors } from '../globalImport';

import {
  projectCreateQueryDTO,
  projectUpdateQueryDTO,
  projectUpdateUserQueryDTO,
  projectGetOneQueryDTO,
  projectGetOneAnswerDTO,
  projectAddUserQueryDTO,
  projectDeleteUserQueryDTO,
  projectDeleteUserAnswerDTO,
} from './project.dto';

import { ProjectService } from './project.service';
import { UserService } from '../user/user.service';
import { SessionService } from '../session/session.service';
import { FileService } from '../file/file.service';
import { UtilsService } from '../utils/utils.service';

@nestjs.Controller('project')
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@nestjs.UseGuards(decorators.validateSession)
@swagger.ApiTags('project')
@swagger.ApiResponse({ status: 400, description: 'Формат ответа для всех ошибок', type: interfaces.response.exception })
@swagger.ApiExtraModels(models.project2user, models.user, projectGetOneAnswerDTO, projectDeleteUserAnswerDTO)
export class ProjectController {
  constructor(
    private projectService: ProjectService,
    private userService: UserService,
    private sessionService: SessionService,
    private fileService: FileService,
    private utils: UtilsService,
  ) {}

  async validateUserLinkAndReturn(id: number, data: { userId?: number; session?: FastifySession }) {
    if (!id) throw new nestjs.BadRequestException('Project ID is empty');
    const userId = data.userId || (await this.sessionService.getUserId(data.session));
    const userLink = await this.projectService.getUserLink(userId, id, { attributes: ['id', 'role'] });
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
    await this.validateUserLinkAndReturn(projectId, { session });
    
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

    await this.projectService.update(projectId, data.projectData);
    return httpAnswer.OK;
  }

  @nestjs.Post('updateUser')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiConsumes('multipart/form-data')
  @swagger.ApiResponse(new interfaces.response.success())
  async updateUser(@nestjs.Body() @decorators.Multipart() data: projectUpdateUserQueryDTO) {
    const projectId = data.projectId;
    const userId = data.userId;
    const userLink = await this.validateUserLinkAndReturn(projectId, { userId });

    await this.projectService.update(projectId, { userList: [{ userId, userName: data.userName }] });
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
    await this.validateUserLinkAndReturn(projectId, { session });

    await this.projectService.update(projectId, { userList: [{ role: 'member', userId, deleteTime: null }] });
    return httpAnswer.OK;
  }

  @nestjs.Delete('deleteUser')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success({models: [projectDeleteUserAnswerDTO]}))
  async deleteUser(@nestjs.Body() data: projectDeleteUserQueryDTO, @nestjs.Session() session: FastifySession) {
    const projectId = data.projectId;
    const userId = data.userId;
    const userLink = await this.validateUserLinkAndReturn(projectId, { userId });

    if (userLink.role === 'owner')
      throw new nestjs.BadRequestException(`Invalid action. User (id=${userId}) is project owner.`);
    await this.projectService.updateUserLink(userLink.id, { deleteTime: new Date() });

    const sessionState = await this.sessionService.getState(session);
    if (projectId !== sessionState.currentProjectId) {
      return httpAnswer.OK;
    } else {
      const user = await this.userService.getOne({ id: userId });
      const personalProject = user.projectList.find((project) => project.personal);
      return { ...httpAnswer.OK, data: { redirectProjectId: personalProject.projectId } };
    }
  }
}
