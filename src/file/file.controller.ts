import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';

import { decorators, interfaces, models, types, httpAnswer, interceptors } from '../globalImport';

import * as fs from 'node:fs';
import { join } from 'path';

import { fileUploadQueryDTO } from './file.dto';

import { FileService } from './file.service';
import { UtilsService } from '../utils/utils.service';
import { SessionService } from '../session/session.service';

import { fileDTO, fileDeleteQueryDTO } from './file.dto';

@nestjs.Controller('file')
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@swagger.ApiTags('file')
@swagger.ApiResponse({ status: 400, description: 'Формат ответа для всех ошибок', type: interfaces.response.exception })
export class FileController {
  constructor(private service: FileService, private sessionService: SessionService, private utils: UtilsService) {}

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
  async uploadFile(@nestjs.Body() @decorators.Multipart() data: fileUploadQueryDTO): Promise<any> {
    const file = await this.service.create(Object.assign(data.file, data.fileData));
    return { ...httpAnswer.OK, data: { id: file.id } };
  }

  @nestjs.Delete('delete')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiBody({ type: fileDeleteQueryDTO })
  @swagger.ApiResponse(new interfaces.response.success())
  async delete(@nestjs.Body() data: fileDeleteQueryDTO) {
    await this.validate(data.fileId);
    await this.service.update(data.fileId, { deleteTime: new Date() });
    return httpAnswer.OK;
  }

  async validate(id: number) {
    if (!id) throw new nestjs.BadRequestException('File ID is empty');
    if (!(await this.service.checkExists(id)))
      throw new nestjs.BadRequestException(`File (id=${id}) does not exist`);
  }
}
