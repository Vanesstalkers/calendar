import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize/types';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types, exception, sql } from '../globalImport';

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
                        , task."execUserId"
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
                        , task."execUserId"
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

    if (data.queryType === 'inbox') {
      switch (data.queryData.filter) {
        case 'new':
          sqlWhere = [
            't."deleteTime" IS NULL',
            '"projectId" = :projectId',
            `"timeType" IS DISTINCT FROM 'later'`,
            't."startTime" IS NULL',
            't."endTime" IS NULL',
            't2u."userId" = :myId',
          ];
          break;
        case 'finished':
          sqlWhere = [
            't."deleteTime" IS NULL',
            '"projectId" = :projectId',
            `t."execEndTime" IS NOT NULL AND t."execEndTime" < date_trunc('day', NOW())`,
            't."ownUser" = :myId',
          ];
          break;
        case 'toexec':
          sqlWhere = [
            't."deleteTime" IS NULL',
            '"projectId" = :projectId',
            `"timeType" IS DISTINCT FROM 'later'`,
            't."startTime" IS NULL',
            't."endTime" IS NULL',
            't."ownUser" != :myId',
            't2u."userId" = :myId',
          ];
          break;
      }
      select.inbox = `--sql
          SELECT    t.id, t.title
          FROM      "task" AS t
          LEFT JOIN "task_to_user" AS t2u ON t2u."taskId" = t.id AND t2u."deleteTime" IS NULL
          WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
          LIMIT     :inboxLimit
          OFFSET    :inboxOffset
        `;
      if (!data.queryData.limit) data.queryData.limit = 50;
      replacements.inboxLimit = data.queryData.limit + 1;
      replacements.inboxOffset = data.queryData.offset || 0;
    }

    if (data.queryType === 'schedule') {
      sqlWhere = [
        't2u.id IS NOT NULL',
        't."deleteTime" IS NULL',
        't."projectId" = :projectId',
        `t."timeType" IS DISTINCT FROM 'later'`,
        `(t.regular->>'enabled')::boolean IS DISTINCT FROM true`,
        `t."execEndTime" IS NULL OR t."execEndTime" >= date_trunc('day', NOW())`,
        't."endTime" >= :scheduleFrom::timestamp',
        `t."endTime" <= :scheduleTo::timestamp + '1 day'::interval`,
      ];
      select.schedule = `--sql
        (
          SELECT    t.id, t.title, t.regular, t."startTime", t."endTime", t."addTime"
          FROM      "task" AS t
          LEFT JOIN "task_to_user" AS t2u
          ON t2u."userId" = :myId AND t2u."taskId" = t.id AND t2u."deleteTime" IS NULL
          WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
        )
      `;
      select.schedule += `--sql
        UNION ALL (
          SELECT    t.id, t.title, t.regular, t."startTime", t."endTime", t."addTime"
          FROM      "task" AS t
          LEFT JOIN "task_to_user" AS t2u
          ON t2u."userId" = :myId AND t2u."taskId" = t.id AND t2u."deleteTime" IS NULL
          WHERE     t2u.id IS NOT NULL AND t."deleteTime" IS NULL AND (t.regular->>'enabled')::boolean = true
        )
      `;
      replacements.scheduleFrom = data.queryData.from;
      replacements.scheduleTo = data.queryData.to;
    }

    if (data.queryType === 'overdue') {
      sqlWhere = [
        't2u.id IS NOT NULL',
        't."deleteTime" IS NULL',
        't."projectId" = :projectId',
        `t."timeType" IS DISTINCT FROM 'later'`,
        `(t.regular->>'enabled')::boolean IS DISTINCT FROM true`,
        `t."execEndTime" IS NULL AND t."endTime" IS NOT NULL AND t."endTime" < NOW()`,
        `t."endTime" < date_trunc('day', NOW())`,
      ];
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
      if (!data.queryData.limit) data.queryData.limit = 50;
      replacements.overdueLimit = data.queryData.limit + 1;
      replacements.overdueOffset = data.queryData.offset || 0;
    }
    if (data.queryType === 'later') {
      sqlWhere = [
        't2u.id IS NOT NULL',
        't."deleteTime" IS NULL',
        't."projectId" = :projectId',
        `t."execEndTime" IS NULL OR t."execEndTime" >= date_trunc('day', NOW())`,
        `t."timeType" = 'later'`,
      ];
      select.later = `--sql
        SELECT    t.id, t.title
        FROM      "task" AS t
        LEFT JOIN "task_to_user" AS t2u
        ON t2u."userId" = :myId AND t2u."taskId" = t.id AND t2u."deleteTime" IS NULL
        WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
        LIMIT     :laterLimit
        OFFSET    :laterOffset
      `;
      if (!data.queryData.limit) data.queryData.limit = 50;
      replacements.laterLimit = data.queryData.limit + 1;
      replacements.laterOffset = data.queryData.offset || 0;
    }

    if (data.queryType === 'executors') {
      sqlWhere = [
        't."deleteTime" IS NULL',
        't."projectId" = :projectId',
        't."ownUser" = :myId',
        't2u."userId" != :myId',
        `t."execEndTime" IS NULL OR t."execEndTime" >= date_trunc('day', NOW())`,
      ];
      select.executors = `--sql
        SELECT    t.id
                , t.title
                , t2u."userId" AS "consignedExecUserId"
                , (
                  SELECT    row_to_json(ROW)
                  FROM      (
                            SELECT    p2u."id" AS "projectToUserLinkId"
                                    , "userId"
                                    , "role"
                                    , "personal"
                                    , "userName"
                                    , (${sql.file.getIcon('project_to_user', 'p2u')}) AS "userIconFileId"
                                    , u."name" AS "baseUserName"
                                    , (${sql.file.getIcon('user', 'u')}) AS "baseUserIconFileId"
                            FROM      "project_to_user" AS p2u
                            LEFT JOIN "user" AS u ON u.id = p2u."userId" AND      
                                      u."deleteTime" IS NULL
                            WHERE     p2u."deleteTime" IS NULL AND      
                                      "projectId" = t."projectId" AND      
                                      "userId" = t2u."userId"
                            ) AS ROW
                  ) AS "consignedExecUserData"
        FROM      "task" AS t
        LEFT JOIN "task_to_user" AS t2u ON t2u."taskId" = t.id AND      
                  t2u."deleteTime" IS NULL
        WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
        LIMIT    
                  :executorsLimit
        OFFSET    :executorsOffset
      `;
      if (!data.queryData.limit) data.queryData.limit = 50;
      replacements.executorsLimit = data.queryData.limit + 1;
      replacements.executorsOffset = data.queryData.offset || 0;
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

    let baseTaskList = findData[0][0];
    let taskIdList = [];
    let result = { resultList: [], endOfList: false };

    if (data.queryType === 'schedule') {
      const replaceTask = {};
      for (const task of baseTaskList.schedule) {
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
            currentDate: new Date(data.queryData.from + ' 00:00:00'),
            endDate: new Date(data.queryData.to + ' 23:59:59'),
            iterator: true,
          };
          const taskAddTime = new Date(task.addTime);
          if (taskAddTime > intervalConfig.currentDate) intervalConfig.currentDate = taskAddTime;
          // !!! на самом деле фейковые задачи будут создаваться начиная с сегодняшнего дня,
          // так как за предыдущие дни их уже должен был создать cron (начнет создавать, когда его напишем)

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
      result.resultList = baseTaskList.schedule;
      for (const [id, cloneList] of Object.entries(replaceTask)) {
        result.resultList = result.resultList.filter((task) => task.id !== +id).concat(cloneList);
      }
      taskIdList = taskIdList.concat(result.resultList.map((task) => task.id || task.origTaskId));
    }
    if (data.queryType === 'inbox') {
      result.resultList = baseTaskList.inbox.map((task) => task.id);
      if (result.resultList.length < data.queryData.limit + 1) result.endOfList = true;
      else result.resultList.pop();
      taskIdList = taskIdList.concat(result.resultList);
    }
    if (data.queryType === 'overdue') {
      result.resultList = baseTaskList.overdue.map((task) => task.id);
      if (result.resultList.length < data.queryData.limit + 1) result.endOfList = true;
      else result.resultList.pop();
      taskIdList = taskIdList.concat(result.resultList);
    }
    if (data.queryType === 'later') {
      result.resultList = baseTaskList.later.map((task) => task.id);
      if (result.resultList.length < data.queryData.limit + 1) result.endOfList = true;
      else result.resultList.pop();
      taskIdList = taskIdList.concat(result.resultList);
    }
    if (data.queryType === 'executors') {
      result.resultList = baseTaskList.executors;
      if (result.resultList.length < data.queryData.limit + 1) result.endOfList = true;
      else result.resultList.pop();
      taskIdList = taskIdList.concat(result.resultList.map((task) => task.id));
    }

    const fillDataTaskList = await this.find({ taskIdList, userId });
    const taskMap = fillDataTaskList.reduce((acc, task) => Object.assign(acc, { [task.id]: task }), {});

    if (data.queryType === 'inbox') result.resultList = result.resultList.map((taskId) => taskMap[taskId]);
    if (data.queryType === 'schedule') {
      result.endOfList = true;
      result.resultList = result.resultList.map((task) => {
        return { ...taskMap[task.id || task.origTaskId], ...task };
      });
    }
    if (data.queryType === 'overdue') result.resultList = result.resultList.map((taskId) => taskMap[taskId]);
    if (data.queryType === 'later') result.resultList = result.resultList.map((taskId) => taskMap[taskId]);
    if (data.queryType === 'executors')
      result.resultList = result.resultList.map((task) => ({ ...taskMap[task.id], ...task }));

    return result;
  }
}
