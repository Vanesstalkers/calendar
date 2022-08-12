import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import fastify = require('fastify-multipart');
import { decorators, interfaces, models, types, exception } from '../globalImport';

import * as fs from 'fs';

@nestjs.Injectable()
export class FileService {
  constructor(
    private sequelize: Sequelize,
    @sequelize.InjectModel(models.file) private modelFile: typeof models.file,
    @sequelize.InjectModel(models.user) private modelUser: typeof models.user,
    @sequelize.InjectModel(models.project)
    private modelProject: typeof models.project,
    @sequelize.InjectModel(models.project2user)
    private modelProjectToUser: typeof models.project2user,
  ) {}

  async getOne(id: number): Promise<types['models']['file']> {
    const findData = await this.modelFile.findOne({
      where: {
        id,
      },
      include: { all: true, nested: true },
    });
    return findData;
  }

  async create(data: types['models']['file']) {
    const uploadDir = 'uploads';
    const now = new Date();
    let path = [data.parentType, now.getFullYear(), now.getMonth() + 1, now.getDay()].join('/');
    const checkPath = uploadDir + '/' + path;
    if (!(await fs.promises.stat(checkPath).catch(() => false)))
      await fs.promises.mkdir(checkPath, { recursive: true });

    const newName = path + '/' + now.getTime() + Math.random() + '.' + data.fileExtension;
    await fs.promises
      .rename(uploadDir + '/' + data.fileName, uploadDir + '/' + newName)
      .catch(exception.fsErrorCatcher);

    const file = await this.modelFile.create({
      link: newName,
      fileName: data.fileName,
      fileExtension: data.fileExtension,
      fileMimetype: data.fileMimetype,
      parentType: data.parentType,
      parentId: data.parentId,
      fileType: data.fileType,
    });

    return file;
  }
}
