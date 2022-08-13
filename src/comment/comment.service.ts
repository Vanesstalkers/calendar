import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
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
    const createTransaction = !transaction;
    if (createTransaction) transaction = await this.sequelize.transaction();

    const comment = await this.commentModel.create({ taskId }, { transaction }).catch(exception.dbErrorCatcher);
    await this.update(comment.id, commentData, transaction);

    if (createTransaction) await transaction.commit();
    return comment;
  }

  async update(commentId: number, updateData: commentDTO, transaction?: Transaction) {
    await this.utils.updateDB({ table: 'comment', id: commentId, data: updateData, transaction });
  }

  async getOne(data: { id: number }, config: types['getOneConfig'] = {}) {
    if (config.checkExists) {
      config.include = false;
      config.attributes = ['id'];
    }

    const findData = await this.commentModel
      .findOne({ where: { id: data.id }, attributes: config.attributes })
      .catch(exception.dbErrorCatcher);
    return findData || null;
  }

  async checkExists(id: number) {
    return (await this.getOne({ id }, { checkExists: true }).catch(exception.dbErrorCatcher)) ? true : false;
  }
}
