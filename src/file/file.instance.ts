import * as nestjs from '@nestjs/common';
import { FileService } from './file.service';
// import { userGetOneAnswerDTO } from './user.dto';
import * as fs from 'fs';

@nestjs.Injectable()
export class FileInstance {
  id: number;
  // data: userGetOneAnswerDTO;
  constructor(public fileService: FileService) {}
  async init(userId: number) {
    // if (!userId) throw new nestjs.BadRequestException('User ID is empty');
    // this.id = userId;
    // this.data = await this.userService.getOne({ id: userId });
    // if (!this.data) throw new nestjs.BadRequestException(`User (id=${userId}) not exist`);
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
