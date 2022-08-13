import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types, httpAnswer, interceptors } from '../globalImport';

import { CommentService } from './comment.service';
import { UtilsService } from '../utils/utils.service';
import { SessionService } from '../session/session.service';

import { commentCreateQueryDTO, commentUpdateQueryDTO, commentDeleteQueryDTO } from './comment.dto';

@nestjs.Controller('comment')
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@nestjs.UseGuards(decorators.validateSession)
@swagger.ApiTags('comment')
@swagger.ApiResponse({ status: 400, description: 'Формат ответа для всех ошибок', type: interfaces.response.exception })
export class CommentController {
  constructor(
    private commentService: CommentService,
    private sessionService: SessionService,
    private utils: UtilsService,
  ) {}

  @nestjs.Post('create')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiBody({ type: commentCreateQueryDTO })
  @swagger.ApiResponse(new interfaces.response.created())
  async create(@nestjs.Body() data: commentCreateQueryDTO) {
    if (!data.taskId) throw new nestjs.BadRequestException('Task ID is empty');
    const comment = await this.commentService.create(data.taskId, data.commentData);
    return { ...httpAnswer.OK, data: { id: comment.id } };
  }

  @nestjs.Post('update')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiBody({ type: commentUpdateQueryDTO })
  @swagger.ApiResponse(new interfaces.response.success())
  async update(@nestjs.Body() data: commentUpdateQueryDTO) {
    await this.validate(data?.commentId);
    await this.commentService.update(data.commentId, data.commentData);
    return httpAnswer.OK;
  }

  @nestjs.Delete('delete')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiBody({ type: commentDeleteQueryDTO })
  @swagger.ApiResponse(new interfaces.response.success())
  async delete(@nestjs.Body() data: commentDeleteQueryDTO) {
    await this.validate(data.commentId);
    await this.commentService.update(data.commentId, { deleteTime: new Date() });
    return httpAnswer.OK;
  }

  async validate(id: number) {
    if (!id) throw new nestjs.BadRequestException('Comment ID is empty');
    if (!(await this.commentService.checkExists(id)))
      throw new nestjs.BadRequestException(`Comment (id=${id}) does not exist`);
  }
}
