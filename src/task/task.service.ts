import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { QueryTypes } from 'sequelize';
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

import { TickService } from '../tick/tick.service';
import { UtilsService } from '../utils/utils.service';

@nestjs.Injectable()
export class TaskService {
  constructor(
    private sequelize: Sequelize,
    @sequelize.InjectModel(models.task) private taskModel: typeof models.task,
    @sequelize.InjectModel(models.user) private userModel: typeof models.user,
    @sequelize.InjectModel(models.task2user)
    private taskToUserModel: typeof models.task2user,
    private tickService: TickService,
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
            await this.upsertLinkToUser(taskId, link.id, link, transaction);
          }
          return { preventDefault: true };
        },
        __tick: async (value: any) => {
          const arr: any[] = Array.from(value);
          for (const tick of arr) {
            await this.tickService.create(taskId, tick, transaction);
          }
          return { preventDefault: true };
        },
      },
      transaction,
    });
  }

  async getOne(
    data: { id: number; userId: number },
    config: {
      checkExists?: boolean;
      include?: boolean;
      attributes?: string[];
    } = {},
    transaction?: Transaction,
  ): Promise<any> {
    if (config.checkExists) {
      config.include = false;
      config.attributes = ['id'];
    }

    const findData = await this.sequelize
      .query(
        `--sql
                SELECT    task.title
                        , task.info
                        , array(
                          SELECT    row_to_json(ROW)
                          FROM      (
                                    SELECT    role
                                            , user_id
                                            , status --, t2u.user_name
                                    FROM      "task_to_user" AS t2u
                                    WHERE     t2u.delete_time IS NULL AND      
                                              task_id = task.id
                                    ) AS ROW
                          ) AS userList
                        , array(
                          SELECT    row_to_json(ROW)
                          FROM      (
                                    SELECT    id
                                    FROM      "file" AS taskFile
                                    WHERE     "deleteTime" IS NULL AND      
                                              "parentId" = task.id AND      
                                              "parentType" = 'task'
                                    ) AS ROW
                          ) AS fileList
                        , array(
                          SELECT    row_to_json(ROW)
                          FROM      (
                                    SELECT    id
                                            , text
                                            , status
                                    FROM      "tick"
                                    WHERE     delete_time IS NULL AND      
                                              task_id = task.id
                                    ) AS ROW
                          ) AS tickList
                        , array(
                          SELECT    row_to_json(ROW)
                          FROM      (
                                    SELECT    id
                                            , text
                                            , array(
                                              SELECT    row_to_json(ROW)
                                              FROM      (
                                                        SELECT    "id"
                                                        FROM      "file" AS commentFile
                                                        WHERE     "deleteTime" IS NULL AND      
                                                                  "parentId" = comment.id AND      
                                                                  "parentType" = 'comment'
                                                        ) AS ROW
                                              ) AS fileList
                                    FROM      "comment" AS comment
                                    WHERE     delete_time IS NULL AND      
                                              task_id = task.id
                                    ) AS ROW
                          ) AS commentList
                FROM      "task" AS task
                LEFT JOIN "task_to_user" AS t2u ON t2u.delete_time IS NULL AND      
                          t2u.task_id = task.id AND      
                          t2u.user_id = :userId
                WHERE     task.delete_time IS NULL AND      
                          task.id = :id AND      
                          t2u.id IS NOT NULL
                LIMIT    
                          1
        `,
        {
          type: QueryTypes.SELECT,
          replacements: { id: data.id || null, userId: data.userId || null },
          transaction,
        },
      )
      .catch(exception.dbErrorCatcher);

    return findData || null;
  }

  async upsertLinkToUser(
    task_id: number,
    user_id: number,
    linkData: types['models']['task2user'],
    transaction?: Transaction,
  ): Promise<types['models']['task2user']> {
    const createTransaction = !transaction;
    if (createTransaction) transaction = await this.sequelize.transaction();

    const link = await this.taskToUserModel
      .upsert(
        { task_id, user_id },
        { conflictFields: ['user_id', 'task_id'], transaction },
      )
      .catch(exception.dbErrorCatcher);
    await this.updateLinkToUser(link[0].id, linkData, transaction);

    if (createTransaction) await transaction.commit();
    return link[0];
  }
  async updateLinkToUser(
    linkId: number,
    updateData: types['models']['task2user'],
    transaction?: Transaction,
  ): Promise<void> {
    await this.utils.updateDB({
      table: 'task_to_user',
      id: linkId,
      data: updateData,
      transaction,
    });
  }
  async getLinkToUser(taskId: number, userId: number): Promise<any> {
    const findData = await this.taskToUserModel
      .findOne({
        where: {
          task_id: taskId,
          user_id: userId,
        },
        attributes: ['id'],
      })
      .catch(exception.dbErrorCatcher);
    return findData || null;
  }
}
