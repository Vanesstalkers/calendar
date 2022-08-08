import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';

import {
  decorators,
  interfaces,
  models,
  types,
  httpAnswer,
  interceptors,
} from '../globalImport';

import * as fs from 'node:fs';
import { join } from 'path';

import { FileService } from './file.service';
import { UtilsService } from '../utils/utils.service';
import { SessionService } from '../session/session.service';

import { File } from '../models/file';
import { fileUploadDTO } from './file.dto';

@nestjs.Controller('file')
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@swagger.ApiTags('file')
@swagger.ApiResponse({
  status: 400,
  description: 'Формат ответа для всех ошибок',
  type: () => interfaces.response.exception,
})
export class FileController {
  constructor(
    private service: FileService,
    private sessionService: SessionService,
    private utils: UtilsService,
  ) {}

  @nestjs.Get('get/:id')
  async getOne(
    @nestjs.Param('id') id: 'string',
    @nestjs.Session() session: FastifySession,
    @nestjs.Res({ passthrough: true }) res: FastifyReply,
  ): Promise<nestjs.StreamableFile> {
    if ((await this.sessionService.isLoggedIn(session)) !== true)
      throw new nestjs.ForbiddenException('Access denied');
    if (!id) throw new nestjs.BadRequestException('File ID is empty');

    const file = await this.service.getOne(parseInt(id));
    res.headers({
      'Content-Type': file.file_mimetype,
      'Content-Disposition': `filename="${file.file_name}"`,
    });
    return new nestjs.StreamableFile(
      fs.createReadStream('./uploads/' + file.link),
    );
  }

  @nestjs.Post('/upload')
  @nestjs.Header('Content-Type', 'application/json')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.created())
  @swagger.ApiConsumes('multipart/form-data')
  @swagger.ApiResponse(new interfaces.response.created())
  async uploadFile(
    @nestjs.Body() @decorators.Multipart() data: fileUploadDTO,
  ): Promise<any> {
    const file = await this.service.create(
      Object.assign(data.file, data.fileData),
    );
    return { ...httpAnswer.OK, data: { id: file.id } };
  }
}
