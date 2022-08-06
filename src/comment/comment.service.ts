import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize/types';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import {
  decorators,
  interfaces,
  models,
  types,
  exception,
} from '../globalImport';

import { UtilsService } from '../utils/utils.service';

@nestjs.Injectable()
export class CommentService {
  constructor(
    private sequelize: Sequelize,
    @sequelize.InjectModel(models.comment)
    private commentModel: typeof models.comment,
    private utils: UtilsService,
  ) {}

  async create(
    taskId: number,
    commentData: types['models']['comment'],
    transaction?: Transaction,
  ): Promise<types['models']['comment']> {
    const createTransaction = !transaction;
    if (createTransaction) transaction = await this.sequelize.transaction();

    const comment = await this.commentModel
      .create({ task_id: taskId }, { transaction })
      .catch(exception.dbErrorCatcher);
    await this.update(comment.id, commentData, transaction);

    if (createTransaction) await transaction.commit();
    return comment;
  }

  async update(
    commentId: number,
    updateData: types['models']['comment'] | { delete_time: Date },
    transaction?: Transaction,
  ): Promise<void> {
    await this.utils.updateDB({
      table: 'comment',
      id: commentId,
      data: updateData,
      transaction,
    });
  }

  async getOne(
    data: { id: number },
    config: {
      checkExists?: boolean;
      include?: boolean;
      attributes?: string[];
    } = {},
  ): Promise<any> {
    if (config.checkExists) {
      config.include = false;
      config.attributes = ['id'];
    }

    const findData = await this.commentModel
      .findOne({
        where: { id: data.id },
        attributes: config.attributes,
      })
      .catch(exception.dbErrorCatcher);
    return findData || null;
  }

  async checkExists(id: number): Promise<boolean> {
    return (await this.getOne({ id }, { checkExists: true }).catch(
      exception.dbErrorCatcher,
    ))
      ? true
      : false;
  }
}
