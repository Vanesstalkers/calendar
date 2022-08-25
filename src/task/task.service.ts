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

  async find(replacements, transaction?) {
    if (replacements.taskIdList.length === 0) return [];
    const findData = await this.sequelize
      .query(
        `--sql
                SELECT    task.id
                        , task.title
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
                          task.id IN (:taskIdList)
        `,
        { type: QueryTypes.SELECT, replacements, transaction },
      )
      .catch(exception.dbErrorCatcher);

    return findData || null;
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

  async searchAll(data: taskSearchAllQueryDTO = { query: '', limit: 50, offset: 0 }) {
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
                OFFSET    
                          :offset
        `,
        {
          replacements: {
            query: `%${(data.query || '').trim()}%`,
            projectId: data.projectId,
            limit: data.limit + 1,
            offset: data.offset,
          },
        },
      )
      .catch(exception.dbErrorCatcher);

    let endOfList = false;
    if (!findData[0]) {
      endOfList = true;
    } else {
      if (findData[0]?.length < data.limit + 1) {
        endOfList = true;
      } else {
        findData[0].pop();
      }
    }
    return { data: findData[0], endOfList };
  }

  async search(data: taskSearchQueryDTO = {}, userId: number) {
    const replacements: any = { myId: userId, projectId: data.projectId };
    let sqlWhere = [];
    const select: any = {};

    if (data.inbox) {
      switch (data.inbox.filter) {
        case 'new':
          sqlWhere.push('t."endTime" IS NULL');
          sqlWhere.push('(t."ownUser" = :myId AND t2u.id IS NULL) OR (t2u."userId" = :myId)');
          break;
        case 'finished':
          sqlWhere.push('t."execUser" = :myId');
          sqlWhere.push('t."ownUser" = :myId OR t2u."userId" = :myId');
          break;
        case 'toexec':
          sqlWhere.push('t."endTime" IS NULL');
          sqlWhere.push('t."ownUser" != :myId');
          sqlWhere.push('t2u."userId" = :myId');
          break;
      }
      if (sqlWhere.length) {
        sqlWhere = sqlWhere.concat([
          't."deleteTime" IS NULL',
          '"projectId" = :projectId',
          `"timeType" IS DISTINCT FROM 'later'`,
        ]);
        select.inbox = `--sql
          SELECT    t.id, t.title
          FROM      "task" AS t
          LEFT JOIN "task_to_user" AS t2u ON t2u."taskId" = t.id AND t2u."deleteTime" IS NULL
          WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
          LIMIT     :inboxLimit
          OFFSET    :inboxOffset
        `;
        if (!data.inbox.limit) data.inbox.limit = 50;
        replacements.inboxLimit = data.inbox.limit + 1;
        replacements.inboxOffset = data.inbox.offset || 0;
      }
    }

    if (data.schedule) {
      sqlWhere = [
        't2u.id IS NOT NULL',
        't."deleteTime" IS NULL',
        't."projectId" = :projectId',
        `t."timeType" IS DISTINCT FROM 'later'`,
      ];
      sqlWhere.push('t."endTime" >= :scheduleFrom::timestamp');
      sqlWhere.push(`t."endTime" <= :scheduleTo::timestamp + '1 day'::interval`);
      select.schedule = `--sql
        (
          SELECT    t.id, t.title, t.regular, t."startTime", t."endTime"
          FROM      "task" AS t
          LEFT JOIN "task_to_user" AS t2u 
          ON t2u."userId" = :myId AND t2u."taskId" = t.id AND t2u."deleteTime" IS NULL
          WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
        )
      `;
      select.schedule += `--sql
        UNION ALL (
          SELECT    t.id, t.title, t.regular, t."startTime", t."endTime"
          FROM      "task" AS t
          LEFT JOIN "task_to_user" AS t2u 
          ON t2u."userId" = :myId AND t2u."taskId" = t.id AND t2u."deleteTime" IS NULL
          WHERE     t2u.id IS NOT NULL AND t."deleteTime" IS NULL AND (t.regular->>'enabled')::boolean = true
        )
      `;
      replacements.scheduleFrom = data.schedule.from;
      replacements.scheduleTo = data.schedule.to;
    }

    if (data.overdue) {
      sqlWhere = [
        't2u.id IS NOT NULL',
        't."deleteTime" IS NULL',
        't."projectId" = :projectId',
        `t."timeType" IS DISTINCT FROM 'later'`,
         /* !!! IS DISTINCT FROM */ "NOT (t.regular->>'enabled')::boolean OR t.regular->>'enabled' IS NULL",
      ];
      // sqlWhere.push(`
      //   "execEndTime" IS NULL AND
      //   (("endTime" IS NOT NULL AND "endTime" < NOW()) OR
      //   ("endTime" IS NULL AND "startTime" < NOW()))
      // `);
      sqlWhere.push(`t."execEndTime" IS NULL AND t."endTime" IS NOT NULL AND t."endTime" < NOW()`);
      select.overdue = `--sql
        (
          SELECT    t.id, t.title, t.regular, t."startTime", t."endTime"
          FROM      "task" AS t
          LEFT JOIN "task_to_user" AS t2u 
          ON t2u."userId" = :myId AND t2u."taskId" = t.id AND t2u."deleteTime" IS NULL
          WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
          LIMIT     :overdueLimit
          OFFSET    :overdueOffset
        )
      `;
      if (!data.overdue.limit) data.overdue.limit = 50;
      replacements.overdueLimit = data.overdue.limit + 1;
      replacements.overdueOffset = data.overdue.offset || 0;
    }

    if (data.later) {
      sqlWhere = ['t2u.id IS NOT NULL', 't."deleteTime" IS NULL', 't."projectId" = :projectId'];
      sqlWhere.push(`t."timeType" = 'later'`);
      select.later = `--sql
        SELECT    t.id, t.title
        FROM      "task" AS t
        LEFT JOIN "task_to_user" AS t2u 
        ON t2u."userId" = :myId AND t2u."taskId" = t.id AND t2u."deleteTime" IS NULL
        WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
        LIMIT     :laterLimit
        OFFSET    :laterOffset
      `;
      if (!data.later.limit) data.later.limit = 50;
      replacements.laterLimit = data.later.limit + 1;
      replacements.laterOffset = data.later.offset || 0;
    }

    if (data.executors) {
      sqlWhere = ['t."deleteTime" IS NULL', 't."projectId" = :projectId'];
      sqlWhere.push('t."ownUser" = :myId');
      sqlWhere.push('t2u."userId" != :myId');
      select.executors = `--sql
        SELECT    t.id, t.title, t2u."userId" AS "execUserId"
        FROM      "task" AS t
        LEFT JOIN "task_to_user" AS t2u ON t2u."taskId" = t.id AND t2u."deleteTime" IS NULL
        WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
        LIMIT     :executorsLimit
        OFFSET    :executorsOffset
      `;
      if (!data.executors.limit) data.executors.limit = 50;
      replacements.executorsLimit = data.executors.limit + 1;
      replacements.executorsOffset = data.executors.offset || 0;
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
    let taskIdList = [];

    if (result.schedule) {
      const replaceTask = {};
      for (const task of result.schedule) {
        if (task.regular.enabled) {
          const hasEndTime = task.endTime ? true : false;

          function fillRegularTasks(interval) {
            let i = 0;
            while (true) {
              try {
                if (i++ > 10) throw new Error('Too wide range'); // библиотека очень медленная
                const newDate = interval.next();
                const cloneTask = { ...task, id: undefined, origTaskId: task.id, regular: true };
                if (hasEndTime) {
                  cloneTask.endTime = newDate.value.toISOString();
                } else {
                  cloneTask.startTime = newDate.value.toISOString();
                }
                replaceTask[task.id].push(cloneTask);
              } catch (e) {
                break;
              }
            }
          }

          replaceTask[task.id] = [];
          const d = new Date(hasEndTime ? task.endTime : task.startTime);
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
    if (result.inbox) {
      result.inbox = { data: result.inbox.map((task) => task.id), endOfList: false };
      if (result.inbox.data.length < data.inbox.limit + 1) result.inbox.endOfList = true;
      else result.inbox.data.pop();
      taskIdList = taskIdList.concat(result.inbox.data);
    }
    if (result.schedule) taskIdList = taskIdList.concat(result.schedule.map((task) => task.id || task.origTaskId));
    if (result.overdue) {
      result.overdue = { data: result.overdue.map((task) => task.id), endOfList: false };
      if (result.overdue.data.length < data.overdue.limit + 1) result.overdue.endOfList = true;
      else result.overdue.data.pop();
      taskIdList = taskIdList.concat(result.overdue.data);
    }
    if (result.later) {
      result.later = { data: result.later.map((task) => task.id), endOfList: false };
      if (result.later.data.length < data.later.limit + 1) result.later.endOfList = true;
      else result.later.data.pop();
      taskIdList = taskIdList.concat(result.later.data);
    }
    if (result.executors) {
      result.executors = { data: result.executors.map((task) => task.id), endOfList: false };
      if (result.executors.data.length < data.executors.limit + 1) result.executors.endOfList = true;
      else result.executors.data.pop();
      taskIdList = taskIdList.concat(result.executors.data);
    }

    const taskList = await this.find({ taskIdList, userId });
    const taskMap = taskList.reduce((acc, task) => Object.assign(acc, { [task.id]: task }), {});

    if (result.inbox) result.inbox.data = result.inbox.data.map((taskId) => taskMap[taskId]);
    if (result.schedule)
      result.schedule = {
        endOfList: true,
        data: result.schedule.map((task) => {
          return { ...taskMap[task.id || task.origTaskId], id: undefined, origTaskId: task.origTaskId };
        }),
      };
    if (result.overdue) result.overdue.data = result.overdue.data.map((taskId) => taskMap[taskId]);
    if (result.later) result.later.data = result.later.data.map((taskId) => taskMap[taskId]);
    if (result.executors) result.executors.data = result.executors.data.map((taskId) => taskMap[taskId]);

    return result;
  }
}
