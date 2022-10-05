import * as fs from 'node:fs';
import * as nestjs from '@nestjs/common';

import { FileService, FileServiceSingleton } from './file.service';

@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class FileInstanceSingleton {
  id: number;
  constructor(public fileService: FileServiceSingleton) {}
  async init(userId: number) {
    return this;
  }
  /**
   * @throws `File content is empty`
   * @throws `File mime-type is empty`
   */
  async uploadAndGetDataFromBase64(data) {
    if (!data?.fileContent?.length) throw new nestjs.BadRequestException({ msg: 'File content is empty' });
    if (data.fileContent.includes(';base64,')) {
      const fileContent = data.fileContent.split(';base64,');
      data.fileContent = fileContent[1];
      if (!data.fileMimetype) data.fileMimetype = fileContent[0].replace('data:', '');
    }
    if (!data.fileMimetype) throw new nestjs.BadRequestException({ msg: 'File mime-type is empty' });

    if (!data.fileExtension) data.fileExtension = (data.fileName || '').split('.').pop();
    if (!data.fileName) data.fileName = ((Date.now() % 10000000) + Math.random()).toString() + '.' + data.fileExtension;
    data.link = './uploads/' + data.fileName;
    await fs.promises.writeFile(data.link, Buffer.from(data.fileContent, 'base64'));

    return data;
  }
}

@nestjs.Injectable({ scope: nestjs.Scope.REQUEST })
export class FileInstance extends FileInstanceSingleton {
  constructor(public fileService: FileService) {
    super(fileService);
  }
}
