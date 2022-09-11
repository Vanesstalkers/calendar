import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize/types';
import { Cron } from '@nestjs/schedule';
import { decorators, interfaces, models, types, exception, sql } from '../globalImport';

import * as parser from 'cron-parser';

import {
  taskFullDTO,
  taskUpdateDTO,
  taskUserLinkFullDTO,
  taskTickDTO,
  taskHashtagDTO,
  taskGetAllQueryDTO,
  taskSearchQueryDTO,
} from './task.dto';

import { UtilsService } from '../utils/utils.service';

const REGULAR_TASK_SHIFT_DAYS_COUNT = 14;

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

  async create(taskData: taskFullDTO, transaction?: Transaction) {
    try {
      const createTransaction = !transaction;
      if (createTransaction) transaction = await this.sequelize.transaction();
      const createData = await this.sequelize
        .query(
          `
          INSERT INTO task ("projectId", "addTime", "updateTime") VALUES (:projectId, NOW(), NOW()) RETURNING id;
        `,
          { type: QueryTypes.INSERT, replacements: { projectId: taskData.projectId }, transaction },
        )
        .catch(exception.dbErrorCatcher);
      const task = createData[0][0];

      await this.update(task.id, taskData, transaction);
      if (taskData.regular) await this.cloneRegularTask(task.id, taskData, transaction);

      if (createTransaction) await transaction.commit();
      return task;
    } catch (err) {
      if (transaction && !transaction.hasOwnProperty('finished')) await transaction.rollback();
      throw err;
    }
  }

  async update(taskId: number, updateData: taskUpdateDTO, transaction?: Transaction) {
    try {
      const createTransaction = !transaction;
      if (createTransaction) transaction = await this.sequelize.transaction();

      await this.utils.updateDB({
        table: 'task',
        id: taskId,
        data: updateData,
        jsonKeys: ['regular'],
        handlers: {
          userList: async (value: [taskUserLinkFullDTO]) => {
            const arr: taskUserLinkFullDTO[] = Array.from(value);
            for (const link of arr) {
              if (link.userId) await this.upsertLinkToUser(taskId, link.userId, link, transaction);
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

      if (createTransaction) await transaction.commit();
    } catch (err) {
      if (transaction && !transaction.hasOwnProperty('finished')) await transaction.rollback();
      throw err;
    }
  }

  async getMany(replacements, config: types['getOneConfig'] = {}) {
    if (replacements.taskIdList.length === 0) return [];

    const where = [`task.id IN (:taskIdList)`];
    if (!config.canBeDeleted) where.push(`task."deleteTime" IS NULL`);

    const findData = await this.sequelize
      .query(
        `--sql
                SELECT    task."id"
                        , task."title"
                        , task."info"
                        , task."projectId"
                        , task."groupId"
                        , task."startTime"
                        , task."endTime"
                        , task."timeType"
                        , task."require"
                        , task."regular"
                        , task."extDestination"
                        , task."execEndTime"
                        , task."execUserId"
                        , task."deleteTime"
                        , (
                          ${sql.selectProjectToUserLink(
                            { projectId: 'task."projectId"', userId: 'task."ownUserId"' },
                            { addUserData: true },
                          )}
                        ) AS "ownUser"
                        , array(${sql.json(`--sql
                            SELECT    t2u."id", t2u."role", t2u."userId", t2u."status", p2u.*
                            FROM      "task_to_user" AS t2u, (
                              (${sql.selectProjectToUserLink({}, { addUserData: true, jsonWrapper: false })})
                            ) AS p2u
                            WHERE     t2u."deleteTime" IS NULL AND t2u."taskId" = task.id AND
                                      p2u."projectId" = task."projectId" AND p2u."userId" = t2u."userId"
                        `)}) AS "userList"
                        , array(${sql.json(`--sql
                            SELECT    "id" AS "tickId", "text", "status"
                            FROM      "tick"
                            WHERE     "deleteTime" IS NULL AND "taskId" = task.id
                        `)}) AS "tickList"
                        , array(${sql.json(`--sql
                            SELECT    id AS "commentId", "text"
                                    , array(${sql.json(`--sql
                                        SELECT    "id" AS "fileId", "fileType"
                                        FROM      "file"
                                        WHERE     "deleteTime" IS NULL AND "parentId" = comment.id AND "parentType" = 'comment'
                                    `)}) AS "fileList"
                            FROM      "comment" AS comment
                            WHERE     "deleteTime" IS NULL AND "taskId" = task.id
                          `)}) AS "commentList"
                          , array(${sql.json(`--sql
                              SELECT    id AS "hashtagId", "name"
                              FROM      "hashtag"
                              WHERE     "deleteTime" IS NULL AND "taskId" = task.id
                          `)}) AS "hashtagList"
                          , array(${sql.json(`--sql
                              SELECT    id AS "fileId", "fileType"
                              FROM      "file" AS taskFile
                              WHERE     "deleteTime" IS NULL AND "parentId" = task.id AND "parentType" = 'task'
                          `)}) AS "fileList"
                FROM      "task" AS task
                WHERE     ${where.join(' AND ')}
        `,
        { type: QueryTypes.SELECT, replacements },
      )
      .catch(exception.dbErrorCatcher);

    return findData || null;
  }

  async getOne(data: { id: number; userId?: number }, config: types['getOneConfig'] = {}) {
    const where = [`task.id = :id`];
    if (!config.canBeDeleted) where.push(`task."deleteTime" IS NULL`);

    if (config.attributes?.length) {
      const findData = await this.sequelize
        .query(
          `--sql
            SELECT ${config.attributes.join(',')} 
            FROM      "task" AS task
                      LEFT JOIN "task_to_user" AS t2u
                        ON t2u."deleteTime" IS NULL AND t2u."taskId" = task.id AND t2u."userId" = :userId
            WHERE     ${where.join(' AND ')}
            LIMIT     1
          `,
          {
            type: QueryTypes.SELECT,
            replacements: { id: data.id || null, userId: data.userId || null },
          },
        )
        .catch(exception.dbErrorCatcher);

      return findData[0] || null;
    } else {
      const findData = await this.getMany({ taskIdList: [data.id] }, config);
      return findData[0] || null;
    }
  }

  async upsertLinkToUser(taskId: number, userId: number, linkData: taskUserLinkFullDTO, transaction?: Transaction) {
    try {
      const createTransaction = !transaction;
      if (createTransaction) transaction = await this.sequelize.transaction();

      const link = await this.taskToUserModel
        .upsert({ taskId, userId }, { conflictFields: ['taskId', 'userId'], transaction })
        .catch(exception.dbErrorCatcher);
      await this.updateUserLink(link[0].id, linkData, transaction);

      if (createTransaction) await transaction.commit();
      return link[0];
    } catch (err) {
      if (transaction && !transaction.hasOwnProperty('finished')) await transaction.rollback();
      throw err;
    }
  }
  async updateUserLink(linkId: number, updateData: taskUserLinkFullDTO, transaction?: Transaction) {
    try {
      const createTransaction = !transaction;
      if (createTransaction) transaction = await this.sequelize.transaction();

      if (!updateData.deleteTime) updateData.deleteTime = null;
      await this.utils.updateDB({ table: 'task_to_user', id: linkId, data: updateData, transaction });

      if (createTransaction) await transaction.commit();
    } catch (err) {
      if (transaction && !transaction.hasOwnProperty('finished')) await transaction.rollback();
      throw err;
    }
  }
  async getUserLink(taskId: number, userId: number) {
    const findData = await this.taskToUserModel
      .findOne({ where: { taskId, userId }, attributes: ['id'] })
      .catch(exception.dbErrorCatcher);
    return findData || null;
  }

  async upsertHashtag(taskId: number, name: string, transaction?: Transaction) {
    try {
      const createTransaction = !transaction;
      if (createTransaction) transaction = await this.sequelize.transaction();

      const link = await this.hashtagModel
        .upsert({ taskId, name, deleteTime: null }, { conflictFields: ['taskId', 'name'], transaction })
        .catch(exception.dbErrorCatcher);
      // await this.updateHashtag(link[0].id, hashtagData, transaction);

      if (createTransaction) await transaction.commit();
      return link[0];
    } catch (err) {
      if (transaction && !transaction.hasOwnProperty('finished')) await transaction.rollback();
      throw err;
    }
  }
  async updateHashtag(id: number, data: taskHashtagDTO, transaction?: Transaction) {
    try {
      const createTransaction = !transaction;
      if (createTransaction) transaction = await this.sequelize.transaction();

      await this.utils.updateDB({ table: 'hashtag', id, data, transaction });

      if (createTransaction) await transaction.commit();
    } catch (err) {
      if (transaction && !transaction.hasOwnProperty('finished')) await transaction.rollback();
      throw err;
    }
  }
  async getHashtag(taskId: number, name: string) {
    const findData = await this.hashtagModel
      .findOne({ where: { taskId, name }, attributes: ['id'] })
      .catch(exception.dbErrorCatcher);
    return findData || null;
  }

  async createTick(taskId: number, tickData: taskTickDTO, transaction?: Transaction) {
    try {
      const createTransaction = !transaction;
      if (createTransaction) transaction = await this.sequelize.transaction();

      const tick = await this.tickModel.create({ taskId }, { transaction }).catch(exception.dbErrorCatcher);
      await this.updateTick(tick.id, tickData, transaction);

      if (createTransaction) await transaction.commit();
      return tick;
    } catch (err) {
      if (transaction && !transaction.hasOwnProperty('finished')) await transaction.rollback();
      throw err;
    }
  }
  async updateTick(id: number, data: taskTickDTO, transaction?: Transaction) {
    try {
      const createTransaction = !transaction;
      if (createTransaction) transaction = await this.sequelize.transaction();

      await this.utils.updateDB({ table: 'tick', id, data, transaction });

      if (createTransaction) await transaction.commit();
    } catch (err) {
      if (transaction && !transaction.hasOwnProperty('finished')) await transaction.rollback();
      throw err;
    }
  }
  async getTick(taskId: number, id: number) {
    const findData = await this.tickModel
      .findOne({ where: { taskId, id }, attributes: ['id'] })
      .catch(exception.dbErrorCatcher);
    return findData || null;
  }

  async search(data: taskSearchQueryDTO = { query: '', limit: 50, offset: 0 }) {
    const hashFlag = /^#/.test(data.query);
    const hashTable = hashFlag ? ', "hashtag" h ' : '';
    const sqlWhere = [`t2u."userId" = :userId OR t."ownUserId" = :userId`];
    if (hashFlag) {
      sqlWhere.push(...['h."deleteTime" IS NULL', 'h."taskId" = t.id AND LOWER(h.name) LIKE LOWER(:query)']);
    } else {
      sqlWhere.push('(LOWER(t.title) LIKE LOWER(:query) OR LOWER(t.info) LIKE LOWER(:query))');
    }
    if (hashFlag) {
      data.query = data.query.replace('#', '');
    }

    const findData = await this.sequelize
      .query(
        `--sql
                SELECT  t.id
                      , t.title                        
                FROM    "task" t
                        LEFT JOIN "task_to_user" AS t2u 
                        ON t2u."taskId" = t.id AND t2u."deleteTime" IS NULL
                        ${hashTable}
                WHERE   t."projectId" IN (
                          SELECT :projectId
                          UNION ALL
                          ${sql.foreignPersonalProjectList()}
                        ) AND 
                        ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
                LIMIT   :limit
                OFFSET  :offset
        `,
        {
          replacements: {
            query: `%${(data.query || '').trim()}%`,
            userId: data.userId,
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

  async getAll(data: taskGetAllQueryDTO = {}, userId: number) {
    const replacements: any = { myId: userId, projectIds: data.projectIds };
    let sqlWhere = [];
    const select: any = {};

    if (data.queryType === 'inbox') {
      switch (data.queryData.filter) {
        case 'new':
          sqlWhere = [
            't."deleteTime" IS NULL', // НЕ удалена
            '"projectId" IN (:projectIds)', // принадлежит проекту
            `"timeType" IS DISTINCT FROM 'later'`, // НЕ относится к задачам "сделать потом"
            [
              't."execEndTime" IS NULL AND t."startTime" IS NULL AND t."endTime" IS NULL', // НЕ указано время начала + НЕ указано время окончания
              `t2u."role" = 'control' AND t2u."status" IS DISTINCT FROM 'control_ready'`, // нужен контроль исполнения назначенной исполнителю задачи
            ]
              .map((item) => `(${item})`)
              .join(' OR '),
            't2u."userId" = :myId', // пользователь назначен исполнителем
          ];
          break;
        case 'finished':
          sqlWhere = [
            't."deleteTime" IS NULL', // НЕ удалена
            '"projectId" IN (:projectIds)', // принадлежит проекту
            't."ownUserId" = :myId', // пользователь является создателем
            `t."execEndTime" IS NOT NULL`, // указано время фактического исполнения
            //`t."execEndTime" IS NOT NULL AND t."execEndTime" < date_trunc('day', NOW())`,
          ];
          break;
        case 'toexec':
          sqlWhere = [
            't."deleteTime" IS NULL', // НЕ удалена
            '"projectId" IN (:projectIds)', // принадлежит проекту
            `"timeType" IS DISTINCT FROM 'later'`, // НЕ относится к задачам "сделать потом"
            't."startTime" IS NULL', // НЕ указано время начала
            't."endTime" IS NULL', // НЕ указано время окончания
            't."ownUserId" != :myId', // пользователь НЕ является создателем
            't2u."userId" = :myId', // пользователь назначен исполнителем
          ];
          break;
      }
      select.inbox = `--sql
          SELECT    t.id, t.title
          FROM      "task" AS t
          LEFT JOIN "task_to_user" AS t2u ON t2u."taskId" = t.id AND t2u."deleteTime" IS NULL
          WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
          GROUP BY  t.id, t.title
          LIMIT     :inboxLimit
          OFFSET    :inboxOffset
        `;
      if (!data.queryData.limit) data.queryData.limit = 50;
      replacements.inboxLimit = data.queryData.limit + 1;
      replacements.inboxOffset = data.queryData.offset || 0;
    }

    if (data.queryType === 'schedule') {
      sqlWhere = [
        't2u.id IS NOT NULL', // пользователь назначен исполнителем
        't."deleteTime" IS NULL', // НЕ удалена
        't."projectId" IN (:projectIds)', // принадлежит проекту
        `t."timeType" IS DISTINCT FROM 'later'`, // НЕ относится к задачам "сделать потом"
        `(t.regular->>'enabled')::boolean IS DISTINCT FROM true`, // НЕ является регулярной (или является клоном)
        `t."execEndTime" IS NULL`, // НЕ указано время фактического исполнения
        `t2u."status" = 'exec_ready'`, // задача принята в работу
        't."endTime" >= NOW()', // задача НЕ просрочена
        't."endTime" >= :scheduleFrom::timestamp', // удовлетворяет запросу
        `t."endTime" <= :scheduleTo::timestamp + '1 day'::interval`, // удовлетворяет запросу
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
      // sqlWhere = [
      //   't2u.id IS NOT NULL', // пользователь назначен исполнителем
      //   't."deleteTime" IS NULL', // НЕ удалена
      //   `(t.regular->>'enabled')::boolean = true`, // регулярная задача
      // ];
      // select.schedule += `--sql
      //   UNION ALL (
      //     SELECT    t.id, t.title, t.regular, t."startTime", t."endTime", t."addTime"
      //     FROM      "task" AS t
      //     LEFT JOIN "task_to_user" AS t2u
      //     ON t2u."userId" = :myId AND t2u."taskId" = t.id AND t2u."deleteTime" IS NULL
      //     WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
      //   )
      // `;
      replacements.scheduleFrom = data.queryData.from;
      replacements.scheduleTo = data.queryData.to;
    }

    if (data.queryType === 'overdue') {
      sqlWhere = [
        't2u.id IS NOT NULL', // пользователь назначен исполнителем
        't."deleteTime" IS NULL', // НЕ удалена
        't."projectId" IN (:projectIds)', // принадлежит проекту
        `t."timeType" IS DISTINCT FROM 'later'`, // НЕ относится к задачам "сделать потом"
        `(t.regular->>'enabled')::boolean IS DISTINCT FROM true`, // НЕ является регулярной (или является клоном)
        `t."execEndTime" IS NULL`, // НЕ указано время фактического исполнения
        't."endTime" < NOW()', // задача просрочена
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
        't2u.id IS NOT NULL', // пользователь назначен исполнителем
        't."deleteTime" IS NULL', // НЕ удалена
        't."projectId" IN (:projectIds)', // принадлежит проекту
        `t."execEndTime" IS NULL`, // НЕ указано время фактического исполнения
        `t."timeType" = 'later'`, // относится к задачам "сделать потом"
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
        't."deleteTime" IS NULL', // НЕ удалена
        't."projectId" IN (:projectIds)', // принадлежит проекту
        't."ownUserId" = :myId', // пользователь является создателем
        't2u."userId" IS NOT NULL', // исполнитель назначен
        `t."execEndTime" IS NULL`, // НЕ указано время фактического исполнения
        `_t2u.id IS NULL`, // назначен всего один исполнитель
      ];
      select.executors = `--sql
        SELECT    t.id
                , t.title
                , t2u."userId" AS "consignedExecUserId"
                , (${sql.selectProjectToUserLink(
                  { projectId: 't."projectId"', userId: 't2u."userId"' },
                  { addUserData: true },
                )}) AS "consignedExecUserData"
        FROM      "task" AS t
        LEFT JOIN "task_to_user" AS t2u ON t2u."taskId" = t.id AND t2u."deleteTime" IS NULL AND (t2u."userId" != t."ownUserId")
        LEFT JOIN "task_to_user" AS _t2u ON _t2u."taskId" = t.id AND _t2u."deleteTime" IS NULL AND (_t2u."userId" != t2u."userId")
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
      // const replaceTask = {};
      // for (const task of baseTaskList.schedule) {
      //   if (task.regular.enabled) {
      //     const hasEndTime = task.endTime ? true : false;

      //     function fillRegularTasks(interval) {
      //       let i = 0;
      //       while (true) {
      //         try {
      //           if (i++ > 10) throw new Error('Too wide range'); // библиотека очень медленная
      //           const newDate = interval.next();
      //           const cloneTask = { ...task, id: undefined, origTaskId: task.id, regular: true };
      //           if (hasEndTime) {
      //             cloneTask.endTime = newDate.value.toISOString();
      //           } else {
      //             cloneTask.startTime = newDate.value.toISOString();
      //           }
      //           replaceTask[task.id].push(cloneTask);
      //         } catch (e) {
      //           break;
      //         }
      //       }
      //     }

      //     replaceTask[task.id] = [];
      //     const d = new Date(hasEndTime ? task.endTime : task.startTime);
      //     const intervalConfig = {
      //       currentDate: new Date(data.queryData.from + ' 00:00:00'),
      //       endDate: new Date(data.queryData.to + ' 23:59:59'),
      //       iterator: true,
      //     };
      //     const taskAddTime = new Date(task.addTime);
      //     if (taskAddTime > intervalConfig.currentDate) intervalConfig.currentDate = taskAddTime;
      //     // !!! на самом деле фейковые задачи будут создаваться начиная с сегодняшнего дня,
      //     // так как за предыдущие дни их уже должен был создать cron (начнет создавать, когда его напишем)

      //     switch (task.regular.rule) {
      //       case 'day':
      //         fillRegularTasks(parser.parseExpression(`${d.getMinutes()} ${d.getHours()} * * *`, intervalConfig));
      //         break;
      //       case 'week':
      //         fillRegularTasks(
      //           parser.parseExpression(`${d.getMinutes()} ${d.getHours()} * * ${d.getDay()}`, intervalConfig),
      //         );
      //         break;
      //       case 'month':
      //         fillRegularTasks(
      //           parser.parseExpression(`${d.getMinutes()} ${d.getHours()} ${d.getDate()} * *`, intervalConfig),
      //         );
      //         break;
      //       case 'weekdays':
      //         fillRegularTasks(
      //           parser.parseExpression(
      //             `${d.getMinutes()} ${d.getHours()} * * ${task.regular.weekdaysList.join(',')}`,
      //             intervalConfig,
      //           ),
      //         );
      //         break;
      //     }
      //   }
      // }
      // result.resultList = baseTaskList.schedule;
      // for (const [id, cloneList] of Object.entries(replaceTask)) {
      //   result.resultList = result.resultList.filter((task) => task.id !== +id).concat(cloneList);
      // }
      // taskIdList = taskIdList.concat(result.resultList.map((task) => task.id || task.origTaskId));

      result.resultList = baseTaskList.schedule.map((task) => task.id);
      taskIdList = taskIdList.concat(result.resultList);
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

    const fillDataTaskList = await this.getMany({ taskIdList });
    const taskMap = fillDataTaskList.reduce((acc, task) => Object.assign(acc, { [task.id]: task }), {});

    if (data.queryType === 'inbox') result.resultList = result.resultList.map((taskId) => taskMap[taskId]);
    if (data.queryType === 'schedule') result.resultList = result.resultList.map((taskId) => taskMap[taskId]);
    // if (data.queryType === 'schedule') {
    //   result.endOfList = true;
    //   result.resultList = result.resultList.map((task) => {
    //     return { ...taskMap[task.id || task.origTaskId], ...task };
    //   });
    // }
    if (data.queryType === 'overdue') result.resultList = result.resultList.map((taskId) => taskMap[taskId]);
    if (data.queryType === 'later') result.resultList = result.resultList.map((taskId) => taskMap[taskId]);
    if (data.queryType === 'executors')
      result.resultList = result.resultList.map((task) => ({ ...taskMap[task.id], ...task }));

    return result;
  }

  //@Cron('0 * * * * *')
  async checkForDeleteFinished() {
    console.log('checkForDeleteFinished', new Date().toISOString());
    await this.sequelize
      .query(
        `--sql
        UPDATE task SET "deleteTime" = NOW() WHERE id IN (
          SELECT t.id FROM "task" AS t, "user" AS u
          WHERE u.id = t."ownUserId"
            AND u.config ->> 'autoDeleteFinished' IS NOT NULL
            AND t."execEndTime" + CONCAT(CAST(u.config ->> 'autoDeleteFinished' AS INTEGER), 'seconds')::interval < NOW()
            AND t."deleteTime" IS NULL
        )
        `,
      )
      .catch(exception.dbErrorCatcher);
  }

  @Cron('0 0 3 * * *')
  async cronCreateRegularTaskClones() {
    const nowWithShift = `NOW() + interval '${REGULAR_TASK_SHIFT_DAYS_COUNT} days'`;

    var findData = await this.sequelize
      .query(
        `
          SELECT task.id
                , task."projectId"
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
                , task."ownUserId"
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
                FROM "task" as task
                WHERE  "deleteTime" IS NULL AND
                regular @> '{"enabled":true}' AND 
                  (
                    ( 
                      regular @> '{"rule":"weekdays"}' 
                      AND regular -> 'weekdaysList' @> CAST( CAST((SELECT EXTRACT(ISODOW FROM ${nowWithShift})) AS text) as jsonb) 
                    ) OR
                    (
                      regular @> '{"rule":"week"}' AND 
                        (
                          (
                            "endTime" IS NULL  AND EXTRACT(ISODOW FROM "startTime") = EXTRACT(ISODOW FROM ${nowWithShift})
                          ) OR 
                          EXTRACT(ISODOW FROM "endTime") = EXTRACT(ISODOW FROM ${nowWithShift})                      
                        )
                    ) OR
                    regular @> '{"rule":"day"}' OR
                    (
                      regular @> '{"rule":"month"}' AND
                        (
                          (
                            "endTime" IS NULL  AND 
                            EXTRACT(DAY FROM "startTime") = EXTRACT(DAY FROM ${nowWithShift})
                          ) OR 
                          EXTRACT(DAY FROM "endTime") = EXTRACT(DAY FROM ${nowWithShift})
                        )
                    )
                  )
        `,
      )
      .catch(exception.dbErrorCatcher);
    console.log('cronCreateRegularTaskClones', findData[0]);
    const tasksToClone = findData[0];

    if (tasksToClone.length) {
      const transaction = await this.sequelize.transaction();
      try {
        const dateWithShift = new Date();
        dateWithShift.setDate(dateWithShift.getDate() + REGULAR_TASK_SHIFT_DAYS_COUNT);

        for (const task of tasksToClone) {
          let tempTime;
          let { id, ...newObject } = task;
          newObject.regular.enabled = false;
          newObject.regular.origTaskId = task.id;

          if (newObject.startTime !== null) {
            tempTime = new Date(newObject.startTime);
            tempTime.setFullYear(dateWithShift.getFullYear(), dateWithShift.getMonth(), dateWithShift.getDate());
            newObject.startTime = tempTime.toISOString();
          }

          if (newObject.endTime !== null) {
            tempTime = new Date(newObject.endTime);
            tempTime.setFullYear(dateWithShift.getFullYear(), dateWithShift.getMonth(), dateWithShift.getDate());
            newObject.endTime = tempTime.toISOString();
          }

          this.create(newObject, transaction).catch(exception.dbErrorCatcher);
        }
        await transaction.commit();
      } catch (err) {
        if (transaction && !transaction.hasOwnProperty('finished')) await transaction.rollback();
        throw err;
      }
    }
  }

  async cloneRegularTask(taskId: number, taskData: taskFullDTO, transaction?: Transaction) {
    try {
      const createTransaction = !transaction;
      if (createTransaction) transaction = await this.sequelize.transaction();

      if (taskData.regular.rule == 'month') return;

      const termDate = new Date(
        new Date().setHours(23, 59, 59999) + REGULAR_TASK_SHIFT_DAYS_COUNT * 24 * 60 * 60 * 1000,
      );
      let theDate = new Date(taskData.endTime ? taskData.endTime : taskData.startTime);
      let theStartDate = taskData.startTime ? new Date(taskData.startTime) : null;
      let theEndDate = taskData.endTime ? new Date(taskData.endTime) : null;
      const theStep = taskData.regular.rule == 'week' ? 7 : 1;
      const theDays = taskData.regular.rule == 'weekdays' ? taskData.regular.weekdaysList : null;

      taskData.regular = {
        enabled: false,
        rule: taskData.regular.rule,
        weekdaysList: taskData.regular.weekdaysList,
      };
      taskData.regular.origTaskId = taskId;

      while (theDate <= termDate) {
        if (theStartDate !== null) taskData.startTime = theStartDate.toISOString();
        if (theEndDate !== null) taskData.endTime = theEndDate.toISOString();

        if (theDays === null || theDays.includes(theDate.getDay())) {
          await this.create(taskData, transaction).catch(exception.dbErrorCatcher);
        }

        const timeShift = theStep * 24 * 60 * 60 * 1000;
        theDate = new Date(theDate.getTime() + timeShift);
        if (theStartDate !== null) theStartDate = new Date(theStartDate.getTime() + timeShift);
        if (theEndDate !== null) theEndDate = new Date(theEndDate.getTime() + timeShift);
      }

      if (createTransaction) await transaction.commit();
    } catch (err) {
      if (transaction && !transaction.hasOwnProperty('finished')) await transaction.rollback();
      throw err;
    }
  }
}
