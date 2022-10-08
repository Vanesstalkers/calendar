import * as nestjs from '@nestjs/common';
import * as stream from 'stream';
import * as fs from 'node:fs';
import * as util from 'node:util';

export const notNull = nestjs.createParamDecorator(
  (data: { arg: string; msg?: string; code?: string }, ctx: nestjs.ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.query?.[data.arg]) {
      if (!data.msg) data.msg = `Required parameter is empty (${data.arg})`;
      if (!data.code) data.code = 'NO_REQUIRED_PAREMETER';
      throw new nestjs.BadRequestException(data);
    }
    return parseInt(request.query.contactId);
  },
);

export const Multipart = nestjs.createParamDecorator(async (data: unknown, ctx: nestjs.ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();

  if (!request.isMultipart()) {
    throw new nestjs.BadRequestException('Multipart form-data expected');
  }

  const pump = util.promisify(stream.pipeline);
  const value = {};
  const parts = request.parts();
  for await (const part of parts) {
    if (part.file) {
      const tmpPath = './uploads/' + part.filename;
      await pump(part.file, fs.createWriteStream(tmpPath));
      // const buff = await part.toBuffer()
      // const decoded = Buffer.from(buff.toString(), 'base64').toString()
      // value[part.fieldname] = decoded // set `part.value` to specify the request body value
      value[part.fieldname] = {
        fileName: part.filename,
        fileMimetype: part.mimetype,
        fileExtension: part.filename.split('.').pop(),
        link: tmpPath,
      };
    } else {
      if (part.value[0] === '{') {
        try {
          value[part.fieldname] = JSON.parse(part.value);
        } catch (err) {
          throw new nestjs.BadRequestException({ msg: 'Invalid JSON-data', code: 'DB_BAD_QUERY' });
        }
      } else {
        value[part.fieldname] = part.value;
      }
    }
  }

  return value;
});
