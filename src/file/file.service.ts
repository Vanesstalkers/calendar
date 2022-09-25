import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import fastify = require('fastify-multipart');
import { decorators, interfaces, models, types, exception } from '../globalImport';
import { LoggerService } from '../logger/logger.service';

import * as fs from 'fs';

import { UtilsService } from '../utils/utils.service';
import { fileDTO, fileCreateDTO, fileDeleteQueryDTO } from './file.dto';
import { Transaction } from 'sequelize/types';

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
    private utils: UtilsService,
    private logger: LoggerService,
  ) {}

  async getOne(id: number, config: types['getOneConfig'] = {}) {
    if (!config.attributes) config.attributes = ['*'];
    const findData = await this.utils.queryDB(
      `--sql
        SELECT    ${config.attributes.join(',')} 
        FROM      "file"
        WHERE     "id" = :id AND "deleteTime" IS NULL
      `,
      { replacements: { id }, type: QueryTypes.SELECT },
    );
    return findData[0] || null;
  }

  async create(data: fileCreateDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      const uploadDir = 'uploads';
      const now = new Date();
      let path = [data.parentType, now.getFullYear(), now.getMonth() + 1, now.getDate()].join('/');
      const checkPath = uploadDir + '/' + path;
      if (!(await fs.promises.stat(checkPath).catch(() => false)))
        await fs.promises.mkdir(checkPath, { recursive: true });

      const newName = path + '/' + now.getTime() + Math.random() + '.' + data.fileExtension;
      await fs.promises
        .rename(uploadDir + '/' + data.fileName, uploadDir + '/' + newName)
        .catch(exception.fsErrorCatcher);

      const stats = fs.statSync(uploadDir + '/' + newName);
      const fileSize = stats.size;

      const fileData = {
        link: newName,
        fileName: data.fileName,
        fileExtension: data.fileExtension,
        fileMimetype: data.fileMimetype,
        fileSize: fileSize,
        parentType: data.parentType,
        parentId: data.parentId,
        fileType: data.fileType,
      };
      this.logger.sendLog({ fileData });
      const createData = await this.utils.queryDB(
        `--sql
          INSERT INTO "file"   ("link", "fileName", "fileExtension", "fileMimetype", "fileSize", 
                                    "parentType", "parentId", "fileType", "addTime", "updateTime") 
                          VALUES  (:link, :fileName, :fileExtension, :fileMimetype, :fileSize, 
                                    :parentType, :parentId, :fileType, NOW(), NOW())
          RETURNING id
        `,
        { type: QueryTypes.INSERT, replacements: fileData, transaction },
      );
      const file = createData[0][0];

      return file;
    });
  }

  async update(fileId: number, updateData: fileDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      await this.utils.updateDB({ table: 'file', id: fileId, data: updateData, transaction });
    });
  }

  async checkExists(id: number) {
    return (await this.getOne(id, { attributes: ['id'] }).catch(exception.dbErrorCatcher)) ? true : false;
  }
}
