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
export class TaskService {
  constructor(
    private sequelize: Sequelize,
    @sequelize.InjectModel(models.task) private taskModel: typeof models.task,
    @sequelize.InjectModel(models.user) private userModel: typeof models.user,
    @sequelize.InjectModel(models.task2user)
    private taskToUserModel: typeof models.task2user,
    private utils: UtilsService,
  ) {}

  async create(
    projectId: number,
    taskData: types['models']['task'],
    transaction?: Transaction,
  ): Promise<types['models']['task']> {
    const createTransaction = !transaction;
    if (createTransaction) transaction = await this.sequelize.transaction();

    const task = await this.taskModel
      .create({ project_id: projectId }, { transaction })
      .catch(exception.dbErrorCatcher);
    await this.update(task.id, taskData, transaction);

    if (createTransaction) await transaction.commit();
    return task;
  }

  async update(
    taskId: number,
    updateData: types['models']['task'],
    transaction?: Transaction,
  ): Promise<void> {
    await this.utils.updateDB({
      table: 'task',
      id: taskId,
      data: updateData,
      handlers: {
        __tasktouser: async (value: any) => {
          const arr: any[] = Array.from(value);
          for (const link of arr) {
            await this.createLinkToUser(taskId, link.id, link, transaction);
          }
          return true;
        },
      },
      transaction,
    });
  }

  async getOne(
    data: { id: number; userId?: number },
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

    const whereTaskToUser: { user_id?: number } = {};
    if (data.userId) whereTaskToUser.user_id = data.userId;
    const findData = await this.taskModel
      .findOne({
        where: {
          id: data.id,
        },
        attributes: config.attributes,
        // include: { all: true, nested: true },
        include: config.include === false
            ? undefined
            :  [
          {
            //attributes: ['user_id'],
            model: models.task2user,
            where: whereTaskToUser,
            include: [{ model: models.user }],
            // required: false
          },
        ],
      })
      .catch(exception.dbErrorCatcher);
    return findData || null;
  }

  async createLinkToUser(
    task_id: number,
    user_id: number,
    linkData: types['models']['task2user'],
    transaction?: Transaction,
  ): Promise<types['models']['task2user']> {
    const createTransaction = !transaction;
    if (createTransaction) transaction = await this.sequelize.transaction();

    const link = await this.taskToUserModel
      .create({ task_id, user_id }, { transaction })
      .catch(exception.dbErrorCatcher);
    await this.updateLinkToUser(link.id, linkData, transaction);

    if (createTransaction) await transaction.commit();
    return link;
  }
  async updateLinkToUser(
    linkId: number,
    updateData: types['models']['task2user'],
    transaction: Transaction,
  ): Promise<void> {
    await this.utils.updateDB({
      table: 'task_to_user',
      id: linkId,
      data: updateData,
      transaction,
    });
  }
}
