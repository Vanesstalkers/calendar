import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';

import { decorators, interfaces, types, httpAnswer, interceptors } from '../globalImport';

import * as fs from 'node:fs';
import { join } from 'path';

import { fileUploadQueryDTO, fileUploadWithFormdataQueryDTO } from './file.dto';

import { FileService } from './file.service';
import { FileInstance } from '../file/file.instance';
import { UtilsService } from '../utils/utils.service';
import { SessionService } from '../session/session.service';
import { LoggerService } from '../logger/logger.service';

import { fileDTO, fileDeleteQueryDTO, fileGetDataAnswerDTO } from './file.dto';

@nestjs.Controller('file')
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@swagger.ApiTags('file')
@swagger.ApiResponse({ status: 400, description: 'Формат ответа для всех ошибок', type: interfaces.response.exception })
@swagger.ApiExtraModels(fileGetDataAnswerDTO)
export class FileController {
  constructor(
    private service: FileService,
    private fileInstance: FileInstance,
    private sessionService: SessionService,
    private utils: UtilsService,
    private logger: UtilsService,
  ) {}

  @nestjs.Get('get/:id')
  @nestjs.UseGuards(decorators.isLoggedIn)
  async getOne(
    @nestjs.Param('id') id: 'string',
    @nestjs.Session() session: FastifySession,
    @nestjs.Res({ passthrough: true }) res: FastifyReply,
  ): Promise<nestjs.StreamableFile> {
    const fileId = parseInt(id);
    if (!(fileId > 0)) throw new nestjs.BadRequestException('File ID is not a number');
    const file = await this.service.getOne(fileId);
    if (!file || !file.id) throw new nestjs.BadRequestException({ msg: 'File not found' });

    await fs.promises.stat('./uploads/' + file.link).catch((err) => {
      if (err.code === 'ENOENT') {
        throw new nestjs.BadRequestException({ msg: 'File not found on disk' });
      } else {
        throw err;
      }
    });

    const fileStream = fs.createReadStream('./uploads/' + file.link);
    res.headers({
      'Content-Type': file.fileMimetype,
      //'Content-Disposition': `filename="${file.fileName}"`, // не работает для имен на кириллице
    });
    return new nestjs.StreamableFile(fileStream);
  }

  @nestjs.Get('getData/:id')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success({ models: [fileGetDataAnswerDTO] }))
  async getData(@nestjs.Param('id') id: 'string') {
    const fileId = parseInt(id);
    if (!(fileId > 0)) throw new nestjs.BadRequestException('File ID is not a number');
    const file = await this.service.getOne(fileId);
    if (!file || !file.id) throw new nestjs.BadRequestException({ msg: 'File not found' });

    const stats = await fs.promises.stat('./uploads/' + file.link).catch((err) => {
      if (err.code === 'ENOENT') {
        throw new nestjs.BadRequestException({ msg: 'File not found on disk' });
      } else {
        throw err;
      }
    });

    const fileContent = await fs.promises.readFile('./uploads/' + file.link, { encoding: 'base64' });
    return {
      ...httpAnswer.OK,
      data: {
        fileContent: `data:${file.fileMimetype};base64,${fileContent}`,
        fileName: file.fileName,
        fileMimetype: file.fileMimetype,
        fileSize: stats.size,
        fileUrl: `/file/get/${file.id}`,
      },
    };
  }

  @nestjs.Post('upload')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.created())
  async uploadFile(@nestjs.Body() data: fileUploadQueryDTO) {
    const filledData = await this.fileInstance.uploadAndGetDataFromBase64(data.file);
    const file = await this.service.create(Object.assign(filledData, data.fileData));
    return { ...httpAnswer.OK, data: { id: file.id } };
  }

  @nestjs.Post('uploadWithFormdata')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiConsumes('multipart/form-data')
  @swagger.ApiResponse(new interfaces.response.created())
  async uploadWithFormdata(@nestjs.Body() data: fileUploadWithFormdataQueryDTO) {
    const file = await this.service.create(Object.assign(data.file, data.fileData));
    return { ...httpAnswer.OK, data: { id: file.id } };
  }

  @nestjs.Delete('delete')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async delete(@nestjs.Body() data: fileDeleteQueryDTO) {
    await this.validate(data.fileId);
    await this.service.update(data.fileId, { deleteTime: new Date() });
    return httpAnswer.OK;
  }

  async validate(id: number) {
    if (!id) throw new nestjs.BadRequestException('File ID is empty');
    if (!(await this.service.checkExists(id))) throw new nestjs.BadRequestException(`File (id=${id}) does not exist`);
  }
}
