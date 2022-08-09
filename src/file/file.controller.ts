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
  @nestjs.UseGuards(decorators.isLoggedIn)
  async getOne(
    @nestjs.Param('id') id: 'string',
    @nestjs.Session() session: FastifySession,
    @nestjs.Res({ passthrough: true }) res: FastifyReply,
  ): Promise<nestjs.StreamableFile> {
    if (!id) throw new nestjs.BadRequestException('File ID is empty');

    const file = await this.service.getOne(parseInt(id));
    res.headers({
      'Content-Type': file.fileMimetype,
      'Content-Disposition': `filename="${file.fileName}"`,
    });

    // if (!fs.existsSync('./uploads/' + file.link)) {
    //   !!! это не работает как надо
    //   throw new nestjs.InternalServerErrorException({msg: 'File not found on disk'});
    // } else {
    const fileStream = fs.createReadStream('./uploads/' + file.link);
    return new nestjs.StreamableFile(fileStream);
    // }
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
