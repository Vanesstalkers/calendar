import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';

import { decorators, interfaces, models, types, httpAnswer, interceptors } from '../globalImport';

import * as fs from 'node:fs';
import { join } from 'path';

import { fileUploadQueryDTO, fileUploadWithFormdataQueryDTO } from './file.dto';

import { FileService } from './file.service';
import { UtilsService } from '../utils/utils.service';
import { SessionService } from '../session/session.service';
import { LoggerService } from '../logger/logger.service';

import { fileDTO, fileDeleteQueryDTO, fileGetMetaAnswerDTO } from './file.dto';

@nestjs.Controller('file')
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@swagger.ApiTags('file')
@swagger.ApiResponse({ status: 400, description: 'Формат ответа для всех ошибок', type: interfaces.response.exception })
@swagger.ApiExtraModels(fileGetMetaAnswerDTO)
export class FileController {
  constructor(
    private service: FileService,
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
    if (!id) throw new nestjs.BadRequestException('File ID is empty');

    const file = await this.service.getOne(parseInt(id));

    if (!file || !file.id) throw new nestjs.BadRequestException({ msg: 'File not found' });
    if (!fs.existsSync('./uploads/' + file.link)) {
      // !!! неправильный тип ошибки - нужно заменить
      throw new nestjs.BadRequestException({ msg: 'File not found on disk' });
    } else {
      const fileStream = fs.createReadStream('./uploads/' + file.link);
      res.headers({
        'Content-Type': file.fileMimetype,
        //'Content-Disposition': `filename="${file.fileName}"`, // не работает для имен на кириллице
      });
      return new nestjs.StreamableFile(fileStream);
    }
  }

  @nestjs.Get('getMeta/:id')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success({ models: [fileGetMetaAnswerDTO] }))
  async getMeta(@nestjs.Param('id') id: 'string', @nestjs.Session() session: FastifySession) {
    if (!id) throw new nestjs.BadRequestException('File ID is empty');

    const file = await this.service.getOne(parseInt(id));

    if (!file || !file.id) throw new nestjs.BadRequestException({ msg: 'File not found' });
    if (!fs.existsSync('./uploads/' + file.link)) {
      // !!! неправильный тип ошибки - нужно заменить
      throw new nestjs.BadRequestException({ msg: 'File not found on disk' });
    } else {
      if (!file.fileSize) {
        // !!! убрать после MVP
        const stats = fs.statSync('./uploads/' + file.link);
        file.fileSize = stats.size;
      }
      return {
        ...httpAnswer.OK,
        data: {
          fileName: file.fileName,
          fileMimetype: file.fileMimetype,
          fileSize: file.fileSize,
          fileUrl: `/file/get/${file.id}`,
        },
      };
    }
  }

  @nestjs.Post('upload')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.created())
  async uploadFile(@nestjs.Body() data: fileUploadQueryDTO) {
    if (!data.file?.fileContent?.length) throw new nestjs.BadRequestException({ msg: 'File content is empty' });
    if (data.file.fileContent.includes(';base64,')) {
      const fileContent = data.file.fileContent.split(';base64,');
      data.file.fileContent = fileContent[1];
      if (!data.file.fileMimetype) data.file.fileMimetype = fileContent[0].replace('data:', '');
    }
    if (!data.file.fileMimetype) throw new nestjs.BadRequestException({ msg: 'File mime-type is empty' });

    //if (!data.file.fileMimetype) data.file.fileMimetype = 'image/jpeg';
    if (!data.file.fileExtension) data.file.fileExtension = (data.file.fileName || '').split('.').pop();
    if (!data.file.fileName)
      data.file.fileName = ((Date.now() % 10000000) + Math.random()).toString() + '.' + data.file.fileExtension;
    data.file.link = './uploads/' + data.file.fileName;
    fs.writeFileSync(data.file.link, Buffer.from(data.file.fileContent, 'base64'));

    const file = await this.service.create(Object.assign(data.file, data.fileData));
    return { ...httpAnswer.OK, data: { id: file.id } };
  }

  @nestjs.Post('uploadWithFormdata')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiConsumes('multipart/form-data')
  @swagger.ApiResponse(new interfaces.response.created())
  async uploadWithFormdata(@nestjs.Body() /* @decorators.Multipart() */ data: fileUploadWithFormdataQueryDTO) {
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
