import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize/types';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types, exception } from '../globalImport';

import * as parser from 'cron-parser';

import {
  taskFullDTO,
  taskUpdateDTO,
  taskUserLinkDTO,
  taskTickDTO,
  taskHashtagDTO,
  taskSearchQueryDTO,
  taskSearchAllQueryDTO,
} from './task.dto';

import { UtilsService } from '../utils/utils.service';

@nestjs.Injectable()
export class TaskService {
  constructor(
    private sequelize: Sequelize,
    @sequelize.InjectModel(models.task) private taskModel: typeof models.task,
    @sequelize.InjectModel(models.user) private userModel: typeof models.user,
    @sequelize.InjectModel(models.task2user)
    private taskToUserModel: typeof models.task2user,
    @sequelize.InjectModel(models.tick) private tickModel: typeof models.tick,
    @sequelize.InjectModel(models.hashtag) private hashtagModel: typeof models.hashtag,
    private utils: UtilsService,
  ) {}

  async create(projectId: number, taskData: taskFullDTO, transaction?: Transaction) {
    const createTransaction = !transaction;
    if (createTransaction) transaction = await this.sequelize.transaction();

    const task = await this.taskModel.create({ projectId }, { transaction }).catch(exception.dbErrorCatcher);
    await this.update(task.id, taskData, transaction);

    if (createTransaction) await transaction.commit();
    return task;
  }

  async update(taskId: number, updateData: taskUpdateDTO, transaction?: Transaction) {
    await this.utils.updateDB({
      table: 'task',
      id: taskId,
      data: updateData,
      handlers: {
        userList: async (value: [taskUserLinkDTO]) => {
          const arr: taskUserLinkDTO[] = Array.from(value);
          for (const link of arr) {
            await this.upsertLinkToUser(taskId, link.userId, link, transaction);
          }
          return { preventDefault: true };
        },
        tickList: async (value: any) => {
          const arr: any[] = Array.from(value);
          for (const tick of arr) {
            if (tick.id) {
              await this.updateTick(tick.id, tick, transaction);
            } else {
              await this.createTick(taskId, tick, transaction);
            }
          }
          return { preventDefault: true };
        },
        hashtagList: async (value: any) => {
          const arr: any[] = Array.from(value);
          for (const hashtag of arr) {
            await this.upsertHashtag(taskId, hashtag.name, transaction);
          }
          return { preventDefault: true };
        },
      },
      transaction,
    });
  }

  async getOne(data: { id: number; userId: number }, config: types['getOneConfig'] = {}, transaction?: Transaction) {
    if (config.checkExists) {
      config.include = false;
      config.attributes = ['id'];
    }

    const findData = await this.sequelize
      .query(
        `--sql
                SELECT    task.title
                        , task.info
                        , task."groupId"
                        , task."startTime"
                        , task."endTime"
                        , task."timeType"
                        , task."require"
                        , task."regular"
                        , task."extDestination"
                        , task."execEndTime"
                        , task."execUser"
                        , array(
                          SELECT    row_to_json(ROW)
                          FROM      (
                                    SELECT    role
                                            , "userId"
                                            , status
                                    FROM      "task_to_user" AS t2u
                                    WHERE     t2u."deleteTime" IS NULL AND      
                                              "taskId" = task.id
                                    ) AS ROW
                          ) AS "userList"
                        , array(
                          SELECT    row_to_json(ROW)
                          FROM      (
                                    SELECT    id AS "tickId"
                                            , text
                                            , status
                                    FROM      "tick"
                                    WHERE     "deleteTime" IS NULL AND      
                                              "taskId" = task.id
                                    ) AS ROW
                          ) AS "tickList"
                        , array(
                          SELECT    row_to_json(ROW)
                          FROM      (
                                    SELECT    id AS "commentId"
                                            , text
                                            , array(
                                              SELECT    row_to_json(ROW)
                                              FROM      (
                                                        SELECT    "id" AS "fileId"
                                                                , "fileType"
                                                        FROM      "file"
                                                        WHERE     "deleteTime" IS NULL AND      
                                                                  "parentId" = comment.id AND      
                                                                  "parentType" = 'comment'
                                                        ) AS ROW
                                              ) AS "fileList"
                                    FROM      "comment" AS comment
                                    WHERE     "deleteTime" IS NULL AND      
                                              "taskId" = task.id
                                    ) AS ROW
                          ) AS "commentList"
                          , array(
                            SELECT    row_to_json(ROW)
                            FROM      (
                                      SELECT    id AS "hashtagId"
                                              , name
                                      FROM      "hashtag"
                                      WHERE     "deleteTime" IS NULL AND      
                                                "taskId" = task.id
                                      ) AS ROW
                            ) AS "hashtagList"
                          , task."projectId"
                          , array(
                            SELECT    row_to_json(ROW)
                            FROM      (
                                      SELECT    id AS "fileId"
                                              , "fileType"
                                      FROM      "file" AS taskFile
                                      WHERE     "deleteTime" IS NULL AND      
                                                "parentId" = task.id AND      
                                                "parentType" = 'task'
                                      ) AS ROW
                            ) AS "fileList"
                FROM      "task" AS task
                LEFT JOIN "task_to_user" AS t2u ON t2u."deleteTime" IS NULL AND      
                          t2u."taskId" = task.id AND      
                          t2u."userId" = :userId
                WHERE     task."deleteTime" IS NULL AND      
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

  async upsertLinkToUser(taskId: number, userId: number, linkData: taskUserLinkDTO, transaction?: Transaction) {
    const createTransaction = !transaction;
    if (createTransaction) transaction = await this.sequelize.transaction();

    const link = await this.taskToUserModel
      .upsert({ taskId, userId }, { conflictFields: ['taskId', 'userId'], transaction })
      .catch(exception.dbErrorCatcher);
    await this.updateUserLink(link[0].id, linkData, transaction);

    if (createTransaction) await transaction.commit();
    return link[0];
  }
  async updateUserLink(linkId: number, updateData: taskUserLinkDTO, transaction?: Transaction) {
    await this.utils.updateDB({ table: 'task_to_user', id: linkId, data: updateData, transaction });
  }
  async getUserLink(taskId: number, userId: number) {
    const findData = await this.taskToUserModel
      .findOne({ where: { taskId, userId }, attributes: ['id'] })
      .catch(exception.dbErrorCatcher);
    return findData || null;
  }

  async upsertHashtag(taskId: number, name: string, transaction?: Transaction) {
    const createTransaction = !transaction;
    if (createTransaction) transaction = await this.sequelize.transaction();

    const link = await this.hashtagModel
      .upsert({ taskId, name, deleteTime: null }, { conflictFields: ['taskId', 'name'], transaction })
      .catch(exception.dbErrorCatcher);
    // await this.updateHashtag(link[0].id, hashtagData, transaction);

    if (createTransaction) await transaction.commit();
    return link[0];
  }
  async updateHashtag(id: number, data: taskHashtagDTO, transaction?: Transaction) {
    await this.utils.updateDB({ table: 'hashtag', id, data, transaction });
  }
  async getHashtag(taskId: number, name: string) {
    const findData = await this.hashtagModel
      .findOne({ where: { taskId, name }, attributes: ['id'] })
      .catch(exception.dbErrorCatcher);
    return findData || null;
  }

  async createTick(taskId: number, tickData: taskTickDTO, transaction?: Transaction) {
    const createTransaction = !transaction;
    if (createTransaction) transaction = await this.sequelize.transaction();

    const tick = await this.tickModel.create({ taskId }, { transaction }).catch(exception.dbErrorCatcher);
    await this.updateTick(tick.id, tickData, transaction);

    if (createTransaction) await transaction.commit();
    return tick;
  }
  async updateTick(id: number, data: taskTickDTO, transaction?: Transaction) {
    await this.utils.updateDB({ table: 'tick', id, data, transaction });
  }
  async getTick(taskId: number, id: number) {
    const findData = await this.tickModel
      .findOne({ where: { taskId, id }, attributes: ['id'] })
      .catch(exception.dbErrorCatcher);
    return findData || null;
  }

  async searchAll(data: taskSearchAllQueryDTO = { query: '', limit: 50 }) {
    const hashFlag = /^#/.test(data.query);
    const hashTable = hashFlag ? ', "hashtag" h ' : '';
    const sqlWhere = hashFlag
      ? ' h."taskId" = t.id AND LOWER(h.name) LIKE LOWER(:query) '
      : ' (LOWER(t.title) LIKE LOWER(:query) OR LOWER(t.info) LIKE LOWER(:query)) ';
    if (hashFlag) {
      data.query = data.query.replace('#', '');
    }

    const findData = await this.sequelize
      .query(
        `--sql
                SELECT    t.id,
                          t.title                        
                FROM      "task" t ${hashTable}
                
                WHERE     t."projectId" = :projectId AND 
                          ${sqlWhere}
                LIMIT    
                          :limit
        `,
        { replacements: { query: `%${(data.query || '').trim()}%`, projectId: data.projectId, limit: data.limit } },
      )
      .catch(exception.dbErrorCatcher);
    return findData[0];
  }

  async search(data: taskSearchQueryDTO = {}, userId: number) {
    const replacements: any = { myId: userId, projectId: data.projectId };
    let sqlWhere = [];
    const select: any = {};

    if (data.inbox) {
      switch (data.inbox.filter) {
        case 'new':
          sqlWhere.push('t."startTime" IS NULL');
          sqlWhere.push('(t."ownUser" = :myId AND t2u.id IS NULL) OR (t."ownUser" != :myId AND t2u."userId" = :myId)');
          break;
        case 'finished':
          sqlWhere.push('t."execUser" = :myId');
          break;
        case 'toexec':
          sqlWhere.push('t."startTime" IS NULL');
          sqlWhere.push('t."ownUser" != :myId');
          sqlWhere.push('t2u."userId" = :myId');
          break;
      }
      if (sqlWhere.length) {
        sqlWhere = sqlWhere.concat(['t."deleteTime" IS NULL', '"projectId" = :projectId', '"later" != true']);
        select.inbox = `--sql
          SELECT    t.id, t.title
          FROM      "task" AS t
          LEFT JOIN "task_to_user" AS t2u ON t2u."taskId" = t.id AND t2u."role" = 'exec' AND t2u."deleteTime" IS NULL
          WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
          LIMIT     :inboxLimit
        `;
        replacements.inboxLimit = data.inbox.limit || 50;
      }
    }

    if (data.schedule) {
      sqlWhere = ['"deleteTime" IS NULL', '"projectId" = :projectId', '"later" != true'];
      sqlWhere.push('"startTime" >= :scheduleFrom::timestamp');
      sqlWhere.push(`"startTime" <= :scheduleTo::timestamp + '1 day'::interval`);
      select.schedule = `--sql
        (
          SELECT    id, title, regular, "startTime"
          FROM      "task"
          WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
        )
      `;
      select.schedule += `--sql
        UNION ALL (
          SELECT    id, title, regular, "startTime"
          FROM      "task"
          WHERE     "deleteTime" IS NULL AND (regular->>'enabled')::boolean = true
        )
      `;
      replacements.scheduleFrom = data.schedule.from;
      replacements.scheduleTo = data.schedule.to;
    }

    if (data.overdue) {
      sqlWhere = [
        '"deleteTime" IS NULL',
        '"projectId" = :projectId',
        '"later" != true',
        "NOT (regular->>'enabled')::boolean OR regular->>'enabled' IS NULL",
      ];
      sqlWhere.push(
        `"execEndTime" IS NULL AND (("endTime" IS NOT NULL AND "endTime" < NOW()) OR ("endTime" IS NULL AND "startTime" < NOW()))`,
      );
      select.overdue = `--sql
        (
          SELECT    id, title, regular, "startTime"
          FROM      "task"
          WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
        )
      `;
    }

    if (data.later) {
      sqlWhere = ['"deleteTime" IS NULL', '"projectId" = :projectId'];
      sqlWhere.push('"later" = true');
      select.later = `--sql
        SELECT    id, title
        FROM      "task"
        WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
        LIMIT     :laterLimit
      `;
      replacements.laterLimit = data.later.limit || 50;
    }

    const findData = await this.sequelize
      .query(
        'SELECT ' +
          Object.entries(select)
            .map(([key, sql]) => `array(SELECT row_to_json(ROW) FROM (${sql}) AS ROW) AS "${key}"`)
            .join(','),
        { replacements },
      )
      .catch(exception.dbErrorCatcher);

    const result = findData[0][0];
    if (result.schedule) {
      const replaceTask = {};
      for (const task of result.schedule) {
        if (task.regular.enabled) {
          function fillRegularTasks(interval) {
            while (true) {
              try {
                const newDate = interval.next();
                const cloneTask = {
                  ...task,
                  startTime: newDate.value.toISOString(),
                  id: undefined,
                  origTaskId: task.id,
                  regular: true,
                };
                replaceTask[task.id].push(cloneTask);
              } catch (e) {
                break;
              }
            }
          }

          replaceTask[task.id] = [];
          const d = new Date(task.startTime);
          const intervalConfig = {
            currentDate: new Date(data.schedule.from + ' 00:00:00'),
            endDate: new Date(data.schedule.to + ' 23:59:59'),
            iterator: true,
          };
          switch (task.regular.rule) {
            case 'day':
              fillRegularTasks(parser.parseExpression(`${d.getMinutes()} ${d.getHours()} * * *`, intervalConfig));
              break;
            case 'week':
              fillRegularTasks(
                parser.parseExpression(`${d.getMinutes()} ${d.getHours()} * * ${d.getDay()}`, intervalConfig),
              );
              break;
            case 'month':
              fillRegularTasks(
                parser.parseExpression(`${d.getMinutes()} ${d.getHours()} ${d.getDate()} * *`, intervalConfig),
              );
              break;
            case 'weekdays':
              fillRegularTasks(
                parser.parseExpression(
                  `${d.getMinutes()} ${d.getHours()} * * ${task.regular.weekdaysList.join(',')}`,
                  intervalConfig,
                ),
              );
              break;
          }
        }
      }

      for (const [id, cloneList] of Object.entries(replaceTask)) {
        result.schedule = result.schedule.filter((task) => task.id !== +id).concat(cloneList);
      }
    }

    return result;
  }
}
