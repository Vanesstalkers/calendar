import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types } from '../globalImport';

import { ProjectService } from './project.service';
import { UtilsService } from '../utils/utils.service';
import { SessionService } from '../session/session.service';

class getOneDTO {
  @swagger.ApiProperty({ example: 1, description: 'ID проекта' })
  projectId: number;
}

@nestjs.Controller('project')
@swagger.ApiTags('project')
@swagger.ApiResponse({
  status: 400,
  description: 'Формат ответа для всех ошибок',
  type: () => interfaces.response.exception,
})
@swagger.ApiExtraModels(models.project2user, models.user)
@nestjs.UseGuards(decorators.validateSession)
export class ProjectController {
  constructor(
    private projectService: ProjectService,
    private sessionService: SessionService,
    private utils: UtilsService,
  ) {}

  @nestjs.Post('create')
  @nestjs.UseGuards(decorators.isLoggedIn)
  async create(
    @nestjs.Body() data: types['models']['project'],
    @nestjs.Session() session: FastifySession,
  ) {
    const userId = await this.sessionService.getUserId(session);
    const createResult = await this.projectService.create({
      project: data,
      userId,
    });
    return { status: 'ok' };
  }

  @nestjs.Get('getOne')
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiResponse(
    new interfaces.response.success(models.project, interfaces.response.empty),
  )
  @nestjs.UseGuards(decorators.isLoggedIn)
  async getOne(
    @nestjs.Query() data: getOneDTO,
    @nestjs.Session() session: FastifySession,
  ): Promise<types['interfaces']['response']['success']> {
    if (!data?.projectId)
      throw new nestjs.BadRequestException('Project ID is empty');
    const userId = await this.sessionService.getUserId(session);
    const result = await this.projectService.getOne({
      id: data.projectId,
      userId,
    });
    return { status: 'ok', data: result || new interfaces.response.empty() };
  }
}
