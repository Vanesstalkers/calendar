import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types, httpAnswer, interceptors } from '../globalImport';

import { projectCreateQueryDTO, projectUpdateQueryDTO, projectUpdateUserQueryDTO, projectGetOneAnswerDTO } from './project.dto';

import { ProjectService } from './project.service';
import { UtilsService } from '../utils/utils.service';
import { SessionService } from '../session/session.service';
import { FileService } from '../file/file.service';

class getOneDTO {
  @swagger.ApiProperty({ description: 'ID проекта' })
  projectId: number;
}

@nestjs.Controller('project')
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@nestjs.UseGuards(decorators.validateSession)
@swagger.ApiTags('project')
@swagger.ApiResponse({
  status: 400,
  description: 'Формат ответа для всех ошибок',
  type: () => interfaces.response.exception,
})
@swagger.ApiExtraModels(models.project2user, models.user, projectGetOneAnswerDTO)
export class ProjectController {
  constructor(
    private projectService: ProjectService,
    private sessionService: SessionService,
    private fileService: FileService,
    private utils: UtilsService,
  ) {}

  @nestjs.Post('create')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiBody({ type: projectCreateQueryDTO })
  @swagger.ApiResponse(new interfaces.response.created())
  async create(@nestjs.Body() projectData: projectCreateQueryDTO, @nestjs.Session() session: FastifySession) {
    const userId = await this.sessionService.getUserId(session);
    if (!projectData.userList) projectData.userList = [];
    if (!projectData.userList.find((item) => item.userId === userId)) {
      projectData.userList.push({ userId });
    }
    const project = await this.projectService.create(projectData);
    return { ...httpAnswer.OK, data: { id: project.id } };
  }

  @nestjs.Get('getOne')
  @nestjs.Header('Content-Type', 'application/json')
  // @swagger.ApiResponse(new interfaces.response.success(models.project))
  @swagger.ApiResponse(new interfaces.response.success({ models: [projectGetOneAnswerDTO] }))
  @nestjs.UseGuards(decorators.isLoggedIn)
  async getOne(@nestjs.Query() data: getOneDTO, @nestjs.Session() session: FastifySession) {
    if (!data?.projectId) throw new nestjs.BadRequestException('Project ID is empty');

    const userId = await this.sessionService.getUserId(session);
    const userLink = await this.projectService.getUserLink(userId, data.projectId, { checkExists: true });
    if (!userLink) throw new nestjs.BadRequestException('User is not exist in projects`s user list.');

    const result = await this.projectService.getOne({ id: data.projectId });
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('update')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async update(@nestjs.Body() data: projectUpdateQueryDTO, @nestjs.Session() session: FastifySession) {
    const projectId = data.projectId;
    await this.projectService.update(projectId, data.projectData);
    return httpAnswer.OK;
  }

  @nestjs.Post('updateUser')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiConsumes('multipart/form-data')
  @swagger.ApiResponse(new interfaces.response.success())
  async updateUser(
    @nestjs.Body() @decorators.Multipart() data: projectUpdateUserQueryDTO,
    @nestjs.Session() session: FastifySession,
  ) {
    const projectId = data.projectId;
    const userId = data.userId;
    const userLink = await this.projectService.getUserLink(userId, projectId, { checkExists: true });
    if (!userLink) throw new nestjs.BadRequestException('User is not exist in projects`s user list.');

    await this.projectService.update(projectId, { userList: [{ userId, userName: data.userName }] });
    if (data.iconFile) {
      data.iconFile.parentType = 'project_to_user';
      data.iconFile.parentId = userLink.id;
      data.iconFile.fileType = 'icon';
      await this.fileService.create(data.iconFile);
    }

    return httpAnswer.OK;
  }
}
