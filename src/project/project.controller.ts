import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types, httpAnswer, interceptors } from '../globalImport';

import { projectUpdateQueryDTO } from './project.dto';

import { ProjectService } from './project.service';
import { UtilsService } from '../utils/utils.service';
import { SessionService } from '../session/session.service';

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
@swagger.ApiExtraModels(models.project2user, models.user)
export class ProjectController {
  constructor(
    private projectService: ProjectService,
    private sessionService: SessionService,
    private utils: UtilsService,
  ) {}

  @nestjs.Post('create')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiBody({ type: models.project })
  @swagger.ApiResponse(new interfaces.response.created())
  async create(@nestjs.Body() projectData: types['models']['project'], @nestjs.Session() session: FastifySession) {
    const userId = await this.sessionService.getUserId(session);
    if (!projectData.__projecttouser) projectData.__projecttouser = [];
    if (!projectData.__projecttouser.find((item) => item.id === userId)) {
      projectData.__projecttouser.push({ id: userId });
    }
    const project = await this.projectService.create(projectData);
    return { ...httpAnswer.OK, data: { id: project.id } };
  }

  @nestjs.Get('getOne')
  @nestjs.Header('Content-Type', 'application/json')
  // @swagger.ApiResponse(
  //   new interfaces.response.success(models.project, interfaces.response.empty),
  // )
  @nestjs.UseGuards(decorators.isLoggedIn)
  async getOne(
    @nestjs.Query() data: getOneDTO,
    @nestjs.Session() session: FastifySession,
  ): Promise<{
    status: string;
    data: types['models']['project'] | types['interfaces']['response']['empty'];
  }> {
    if (!data?.projectId) throw new nestjs.BadRequestException('Project ID is empty');
    const userId = await this.sessionService.getUserId(session);
    const result = await this.projectService.getOne({
      id: data.projectId,
      userId,
    });
    return {
      ...httpAnswer.OK,
      data: result || new interfaces.response.empty(),
    };
  }

  @nestjs.Post('update')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async update(@nestjs.Body() data: projectUpdateQueryDTO, @nestjs.Session() session: FastifySession) {
    const projectId = data.projectId;
    await this.projectService.update(projectId, data.projectData);

    return httpAnswer.OK;
  }
}
