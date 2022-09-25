import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { Transaction } from 'sequelize/types';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types, exception } from '../globalImport';

import { commentDTO } from './comment.dto';

import { UtilsService } from '../utils/utils.service';

@nestjs.Injectable()
export class CommentService {
  constructor(
    private sequelize: Sequelize,
    @sequelize.InjectModel(models.comment)
    private commentModel: typeof models.comment,
    private utils: UtilsService,
  ) {}

  async create(taskId: number, commentData: commentDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      const createData = await this.utils.queryDB(
        `INSERT INTO "comment" ("taskId", "addTime", "updateTime") VALUES (:taskId, NOW(), NOW()) RETURNING id`,
        { type: QueryTypes.INSERT, replacements: { taskId }, transaction },
      );
      const comment = createData[0][0];
      await this.update(comment.id, commentData, transaction);
      return comment;
    });
  }

  async update(commentId: number, updateData: commentDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      await this.utils.updateDB({ table: 'comment', id: commentId, data: updateData, transaction });
    });
  }

  async getOne(data: { id: number }, config: types['getOneConfig'] = {}) {
    const findData = await this.utils.queryDB(
      `--sql
        SELECT    ${config.attributes.join(',')} 
        FROM      "comment"
        WHERE     "id" = :id
              AND "deleteTime" IS NULL
        LIMIT     1
        `,
      { type: QueryTypes.SELECT, replacements: { id: data.id || null } },
    );
    return findData || null;
  }

  async checkExists(id: number) {
    return (await this.getOne({ id }, { attributes: ['id'] }).catch(exception.dbErrorCatcher)) ? true : false;
  }
}
