import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import {
  decorators,
  interfaces,
  models,
  types,
  httpAnswer,
  interceptors,
} from '../globalImport';

import { CommentService } from './comment.service';
import { UtilsService } from '../utils/utils.service';
import { SessionService } from '../session/session.service';

import { createCommentDTO, updateCommentDTO } from './comment.dto';

@nestjs.Controller('comment')
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@nestjs.UseGuards(decorators.validateSession)
@swagger.ApiTags('comment')
@swagger.ApiResponse({
  status: 400,
  description: 'Формат ответа для всех ошибок',
  type: () => interfaces.response.exception,
})
export class CommentController {
  constructor(
    private commentService: CommentService,
    private sessionService: SessionService,
    private utils: UtilsService,
  ) {}

  @nestjs.Post('create')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiBody({ type: createCommentDTO })
  @swagger.ApiResponse(new interfaces.response.created())
  async create(@nestjs.Body() data: createCommentDTO) {
    const comment = await this.commentService.create(data.taskId, data.commentData);
    return { ...httpAnswer.OK, data: { id: comment.id } };
  }

  @nestjs.Post('update')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiResponse(new interfaces.response.success())
  async update(@nestjs.Body() data: updateCommentDTO) {
    await this.validate(data?.commentId);
    await this.commentService.update(data.commentId, data.commentData);
    return httpAnswer.OK;
  }

  @nestjs.Delete('delete/:id')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiResponse(new interfaces.response.success())
  async delete(@nestjs.Param('id') id: string) {
    const commentId = parseInt(id);
    await this.validate(commentId);
    await this.commentService.update(commentId, { delete_time: new Date() });
    return httpAnswer.OK;
  }

  async validate(id: number) {
    if (!id) throw new nestjs.BadRequestException('Comment ID is empty');
    if (!(await this.commentService.checkExists(id)))
      throw new nestjs.BadRequestException(`Comment (id=${id}) does not exist`);
  }
}
