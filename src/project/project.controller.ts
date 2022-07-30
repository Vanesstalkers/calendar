import {
  Controller,
  Get,
  Post,
  Header,
  Session,
  Body,
  Query,
  Req,
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import {
  ApiBody,
  ApiQuery,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { validateSession, isLoggedIn } from '../decorators/test.decorator';

import { ProjectService } from './project.service';
import { UtilsService } from '../utils.service';
import { SessionService } from '../session/session.service';

import { Project } from '../models/project';
import { User } from '../models/user';
import { ProjectToUser } from '../models/project_to_user';

import {
  exceptonAnswerDTO,
  emptyAnswerDTO,
  successAnswerDTO,
} from '../dto/httpAnswer';

class getOneDTO {
  @ApiProperty({ example: '1,2,3...', description: 'ID проекта' })
  projectId: number;
  @ApiPropertyOptional({ example: '1,2,3...', description: 'ID пользователя' })
  userId?: number;
}

@Controller('project')
@ApiTags('project')
@ApiResponse({
  status: 400,
  description: 'Формат ответа для всех ошибок',
  type: () => exceptonAnswerDTO,
})
@ApiExtraModels(ProjectToUser, User)
@UseGuards(validateSession)
export class ProjectController {
  constructor(
    private projectService: ProjectService,
    private sessionService: SessionService,
    private utils: UtilsService,
  ) {}

  @Post('create')
  @UseGuards(isLoggedIn)
  async create(@Body() data: Project, @Session() session: FastifySession) {
    const userId = await this.sessionService.getUserId(session);
    const createResult = await this.projectService.create({
      project: data,
      userId,
    });
    return { status: 'ok' };
  }

  @Get('getOne')
  @Header('Content-Type', 'application/json')
  @ApiResponse({ status: 200, type: () => Project })
  @UseGuards(isLoggedIn)
  async getOne(
    @Query() data: getOneDTO,
    @Session() session: FastifySession,
  ): Promise<successAnswerDTO> {
    if (!data?.projectId) throw new BadRequestException('Project ID is empty');
    //const userId = await this.sessionService.getUserId(session);
    const result = await this.projectService.getOne({
      id: data.projectId,
      userId: data.userId,
    });
    return { status: 'ok', data: result || new emptyAnswerDTO() };
  }
}
