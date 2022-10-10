import * as nestjs from '@nestjs/common';
import { QueryTypes } from 'sequelize';
import { Transaction } from 'sequelize/types';
import { Cron } from '@nestjs/schedule';
import { decorators, interfaces, types, exception, sql } from '../globalImport';

import {
  taskFullDTO,
  taskUpdateDTO,
  taskUserLinkFullDTO,
  taskTickDTO,
  taskHashtagDTO,
  taskGetAllQueryDTO,
  taskSearchQueryDTO,
  taskInboxQueryDataDTO,
  taskScheduleQueryDataDTO,
  taskOverdueQueryDataDTO,
  taskLaterQueryDataDTO,
  taskExecutorsQueryDataDTO,
} from './task.dto';

import { UtilsService, UtilsServiceSingleton } from '../utils/utils.service';

const REGULAR_TASK_SHIFT_DAYS_COUNT = 14;

@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class TaskServiceSingleton {
  constructor(public utils: UtilsServiceSingleton) {}

  async create(taskData: taskFullDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      const createData = await this.utils.queryDB(
        `INSERT INTO task ("projectId", "addTime", "updateTime") VALUES (:projectId, NOW(), NOW()) RETURNING id`,
        { type: QueryTypes.INSERT, replacements: { projectId: taskData.projectId }, transaction },
      );
      const task = createData[0][0];

      await this.update(task.id, taskData, transaction);
      if (taskData.regular?.enabled === true) {
        await this.cloneRegularTask(task.id, taskData, transaction);
      }

      return task;
    });
  }

  async update(taskId: number, updateData: taskUpdateDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      if (updateData.groupId !== undefined) delete updateData.groupId;

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
    });
  }

  async getMany(replacements, config: types['getOneConfig'] = {}) {
    if (replacements.taskIdList.length === 0) return [];

    const where = [`task.id IN (:taskIdList)`];
    if (!config.canBeDeleted) where.push(`task."deleteTime" IS NULL`);

    const findData = await this.utils.queryDB(
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
                , array(${sql.json(`--sql  --порядок p2u.* принципиален, т.к. в нем тоже есть "role"
                    SELECT    p2u.*, t2u."id", t2u."role", t2u."userId", t2u."status"
                    FROM      "task_to_user" AS t2u, (
                                (${sql.selectProjectToUserLink({}, { addUserData: true, jsonWrapper: false })})
                              ) AS p2u
                    WHERE     t2u."deleteTime" IS NULL
                          AND t2u."taskId" = task.id
                          AND p2u."projectId" = task."projectId"
                          AND p2u."userId" = t2u."userId"
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
    );

    return findData || null;
  }

  async getOne(data: { id: number; userId?: number }, config: types['getOneConfig'] = {}) {
    const where = [`task.id = :id`];
    if (!config.canBeDeleted) where.push(`task."deleteTime" IS NULL`);

    if (config.attributes?.length) {
      const findData = await this.utils.queryDB(
        `--sql
            SELECT    ${config.attributes.join(',')} 
            FROM      "task" AS task
                      LEFT JOIN "task_to_user" AS t2u ON  t2u."deleteTime" IS NULL 
                                                      AND t2u."taskId" = task.id
                                                      AND t2u."userId" = :userId
            WHERE     ${where.join(' AND ')}
            LIMIT     1
          `,
        {
          type: QueryTypes.SELECT,
          replacements: { id: data.id || null, userId: data.userId || null },
        },
      );

      return findData[0] || null;
    } else {
      const findData = await this.getMany({ taskIdList: [data.id] }, config);
      return findData[0] || null;
    }
  }

  async upsertLinkToUser(taskId: number, userId: number, linkData: taskUserLinkFullDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      const upsertData = await this.utils.queryDB(
        `--sql
            INSERT INTO   "task_to_user" 
                          ("taskId", "userId", "addTime", "updateTime") 
            VALUES        (:taskId, :userId, NOW(), NOW())
            ON CONFLICT   ("taskId", "userId") 
            DO UPDATE SET "taskId" = EXCLUDED."taskId"
                        , "userId" = EXCLUDED."userId"
                        , "updateTime" = EXCLUDED."updateTime" 
            RETURNING     "id"
        `,
        {
          type: QueryTypes.INSERT, // c QueryTypes.UPSERT не возвращает данные
          replacements: { taskId, userId },
          transaction,
        },
      );
      const link = upsertData[0][0];
      await this.updateUserLink(link.id, linkData, transaction);
      return link;
    });
  }
  async updateUserLink(linkId: number, updateData: taskUserLinkFullDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      if (!updateData.deleteTime) updateData.deleteTime = null;
      await this.utils.updateDB({ table: 'task_to_user', id: linkId, data: updateData, transaction });
    });
  }
  async getUserLink(taskId: number, userId: number) {
    const findData = await this.utils.queryDB(
      `--sql
        SELECT    "id"
        FROM      "task_to_user"
        WHERE     "taskId" = :taskId AND "userId" = :userId AND "deleteTime" IS NULL
        `,
      { replacements: { taskId, userId }, type: QueryTypes.SELECT },
    );
    return findData[0] || null;
  }

  async upsertHashtag(taskId: number, name: string, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      const upsertData = await this.utils.queryDB(
        `--sql
            INSERT INTO   "hashtag" 
                          ("taskId", "name", "addTime", "updateTime") 
            VALUES        (:taskId, :name, NOW(), NOW())
            ON CONFLICT   ("taskId", "name") 
            DO UPDATE SET "taskId" = EXCLUDED."taskId"
                        , "name" = EXCLUDED."name"
                        , "updateTime" = EXCLUDED."updateTime" 
            RETURNING     "id"
        `,
        {
          type: QueryTypes.INSERT, // c QueryTypes.UPSERT не возвращает данные
          replacements: { taskId, name },
          transaction,
        },
      );
      const hashtag = upsertData[0][0];
      return hashtag;
    });
  }
  async updateHashtag(id: number, data: taskHashtagDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      await this.utils.updateDB({ table: 'hashtag', id, data, transaction });
    });
  }
  async getHashtag(taskId: number, name: string) {
    const findData = await this.utils.queryDB(
      `--sql
        SELECT    "id"
        FROM      "hashtag"
        WHERE     "taskId" = :taskId AND "name" = :name AND "deleteTime" IS NULL
        `,
      { replacements: { taskId, name }, type: QueryTypes.SELECT },
    );
    return findData[0] || null;
  }

  async createTick(taskId: number, tickData: taskTickDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      const createData = await this.utils.queryDB(
        `INSERT INTO tick ("taskId", "addTime", "updateTime") VALUES (:taskId, NOW(), NOW()) RETURNING id`,
        { type: QueryTypes.INSERT, replacements: { taskId }, transaction },
      );
      const tick = createData[0][0];
      await this.updateTick(tick.id, tickData, transaction);
      return tick;
    });
  }
  async updateTick(id: number, data: taskTickDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      await this.utils.updateDB({ table: 'tick', id, data, transaction });
    });
  }
  async getTick(taskId: number, id: number) {
    const findData = await this.utils.queryDB(
      `--sql
        SELECT    "id"
        FROM      "tick"
        WHERE     "id" = :id AND "taskId" = :taskId AND "deleteTime" IS NULL
        `,
      { replacements: { taskId, id }, type: QueryTypes.SELECT },
    );
    return findData[0] || null;
  }

  async search(data: taskSearchQueryDTO = { query: '', limit: 50, offset: 0 }) {
    const hashFlag = /^#/.test(data.query);
    const hashTable = hashFlag ? ', "hashtag" h ' : '';
    const sqlWhere = [`t2u."userId" = :userId OR t."ownUserId" = :userId`, `t."deleteTime" IS NULL`];
    if (hashFlag) {
      sqlWhere.push(...['h."deleteTime" IS NULL', 'h."taskId" = t.id AND LOWER(h.name) LIKE LOWER(:query)']);
    } else {
      sqlWhere.push('(LOWER(t.title) LIKE LOWER(:query) OR LOWER(t.info) LIKE LOWER(:query))');
    }
    if (hashFlag) {
      data.query = data.query.replace('#', '');
    }

    const findIds = await this.utils.queryDB(
      `--sql
        SELECT    t.id
                , t.title                        
        FROM      "task" t
                  LEFT JOIN "task_to_user" AS t2u ON t2u."taskId" = t.id AND t2u."deleteTime" IS NULL
                  ${hashTable}
        WHERE     t."projectId" IN (
                    SELECT :projectId
                    UNION ALL
                    ${sql.foreignPersonalProjectList()}
                  )
              AND ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
        LIMIT     :limit
        OFFSET    :offset
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
    );

    const findData = await this.getMany({ taskIdList: (findIds[0] || []).map((item) => item.id) });

    let endOfList = false;
    if (!findData) {
      endOfList = true;
    } else {
      if (findData?.length < data.limit + 1) {
        endOfList = true;
      } else {
        findData.pop();
      }
    }
    return { data: findData, endOfList };
  }

  async getAll(data: taskGetAllQueryDTO = {}, userId: number) {
    data.queryData.projectIds = data.projectIds;
    data.queryData.scheduleFilters = data.scheduleFilters;

    switch (data.queryType) {
      case 'inbox':
        return await this.getInboxTasks(userId, data.queryData);
      case 'schedule':
        return await this.getScheduleTasks(userId, data.queryData);
      case 'overdue':
        return await this.getOverdueTasks(userId, data.queryData);
      case 'later':
        return await this.getLaterTasks(userId, data.queryData);
      case 'executors':
        return await this.getExecutorsTasks(userId, data.queryData);
      default:
        return { resultList: [], endOfList: true };
    }

    const replacements: any = { myId: userId };
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
              `t2u."role" = 'exec' AND t2u."status" IS DISTINCT FROM 'exec_ready'`, // время задачи уже указано, но задача еще не принята исполнителем (актуально для встреч)
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
        default:
          return { endOfList: false, resultList: [] };
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
                    LEFT JOIN "task_to_user" AS t2u ON  t2u."userId" = :myId
                                                    AND t2u."taskId" = t.id 
                                                    AND t2u."deleteTime" IS NULL
          WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
          ORDER BY  CASE WHEN t."timeType" = 'day' THEN 1 ELSE 0 END 
                    NULLS FIRST
        )
      `;
      replacements.scheduleFrom = data.queryData.from;
      replacements.scheduleTo = data.queryData.to;

      if (data.scheduleFilters) {
        data.projectIds.push(...Object.keys(data.scheduleFilters).map((projectId) => parseInt(projectId)));
      }
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
                    LEFT JOIN "task_to_user" AS t2u ON  t2u."userId" = :myId 
                                                    AND t2u."taskId" = t.id 
                                                    AND t2u."deleteTime" IS NULL
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
                  LEFT JOIN "task_to_user" AS t2u ON  t2u."userId" = :myId
                                                  AND t2u."taskId" = t.id 
                                                  AND t2u."deleteTime" IS NULL
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
                  LEFT JOIN "task_to_user" AS t2u ON  t2u."taskId" = t.id
                                                  AND t2u."deleteTime" IS NULL 
                                                  AND t2u."userId" != t."ownUserId"
                  LEFT JOIN "task_to_user" AS _t2u ON _t2u."taskId" = t.id
                                                  AND _t2u."deleteTime" IS NULL
                                                  AND _t2u."userId" != t2u."userId"
                  LEFT JOIN "project_to_user" as p2u ON p2u."userId" = t2u."userId"
                                                    AND p2u."projectId" = t."projectId"
                                                    AND p2u."deleteTime" IS NULL
                  LEFT JOIN "user" as u ON u."id" = t2u."userId"
        WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
        ORDER BY  COALESCE(p2u."userName", u."name", u."id"::VARCHAR)
                , t2u."userId"
        LIMIT     :executorsLimit
        OFFSET    :executorsOffset
      `;

      if (!data.queryData.limit) data.queryData.limit = 50;
      replacements.executorsLimit = data.queryData.limit + 1;
      replacements.executorsOffset = data.queryData.offset || 0;
    }

    replacements.projectIds = data.projectIds;
    const findData = await this.utils.queryDB(
      'SELECT ' +
        Object.entries(select)
          .map(([key, sql]) => `array(SELECT row_to_json(ROW) FROM (${sql}) AS ROW) AS "${key}"`)
          .join(','),
      { replacements },
    );

    let baseTaskList = findData[0][0];
    let taskIdList = [];
    let result = { resultList: [], endOfList: false };

    if (data.queryType === 'schedule') {
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
    if (data.queryType === 'schedule') {
      result.resultList = result.resultList.map((taskId) => taskMap[taskId]);
      if (data.scheduleFilters) {
        result.resultList = result.resultList
          .map((task) => {
            const filters = data.scheduleFilters[task.projectId];
            if (filters) {
              function applyShowFilter(task) {
                return filters.showTaskContent
                  ? task
                  : { id: task.id, startTime: task.startTime, endTime: task.endTime };
              }
              if (filters.showAllTasks) {
                return applyShowFilter(task);
              } else {
                return task.userList.length > 1 ? applyShowFilter(task) : null;
              }
            } else {
              return task;
            }
          })
          .filter((task) => task);
      }
    }
    if (data.queryType === 'overdue') result.resultList = result.resultList.map((taskId) => taskMap[taskId]);
    if (data.queryType === 'later') result.resultList = result.resultList.map((taskId) => taskMap[taskId]);
    if (data.queryType === 'executors')
      result.resultList = result.resultList.map((task) => ({ ...taskMap[task.id], ...task }));

    return result;
  }

  async getInboxTasks(userId: number, query: taskInboxQueryDataDTO) {
    const result = { resultList: [], endOfList: true };
    let sqlWhere = [];
    switch (query.filter) {
      case 'new':
        sqlWhere = [
          `"timeType" IS DISTINCT FROM 'later'`, // НЕ относится к задачам "сделать потом"
          [
            't."execEndTime" IS NULL AND t."startTime" IS NULL AND t."endTime" IS NULL', // НЕ указано время начала + НЕ указано время окончания
            `t2u."role" = 'exec' AND t2u."status" IS DISTINCT FROM 'exec_ready'`, // время задачи уже указано, но задача еще не принята исполнителем (актуально для встреч)
            `t2u."role" = 'control' AND t2u."status" IS DISTINCT FROM 'control_ready'`, // нужен контроль исполнения назначенной исполнителю задачи
          ]
            .map((item) => `(${item})`)
            .join(' OR '),
          [
            't2u."userId" = :userId', // пользователь назначен исполнителем
            't."ownUserId" = :userId AND t2u."userId" IS NULL', // пользователь является создателем и исполнитель НЕ назначен
          ]
            .map((item) => `(${item})`)
            .join(' OR '),
        ];
        break;
      case 'finished':
        sqlWhere = [
          't."ownUserId" = :userId', // пользователь является создателем
          `t."execEndTime" IS NOT NULL`, // указано время фактического исполнения
        ];
        break;
      case 'toexec':
        sqlWhere = [
          `"timeType" IS DISTINCT FROM 'later'`, // НЕ относится к задачам "сделать потом"
          't."startTime" IS NULL', // НЕ указано время начала
          't."endTime" IS NULL', // НЕ указано время окончания
          't."ownUserId" != :userId', // пользователь НЕ является создателем
          't2u."userId" = :userId', // пользователь назначен исполнителем
        ];
        break;
      default:
        return result;
    }
    if (!query.limit) query.limit = 50;
    const findData = await this.utils.queryDB(
      `--sql
        SELECT    t.id, t.title
        FROM      "task" AS t
                  LEFT JOIN "task_to_user" AS t2u ON t2u."taskId" = t.id AND t2u."deleteTime" IS NULL
        WHERE     "projectId" IN (:projectIds)
              AND t."deleteTime" IS NULL
              AND ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
        GROUP BY  t.id, t.title
        LIMIT     :limit
        OFFSET    :offset
      `,
      { replacements: { userId, projectIds: query.projectIds, limit: query.limit + 1, offset: query.offset || 0 } },
    );

    result.resultList = findData[0];
    if (result.resultList.length < query.limit + 1) result.endOfList = true;
    else result.resultList.pop();
    const fillDataTaskList = await this.getMany({ taskIdList: result.resultList.map((task) => task.id) });
    const taskMap = fillDataTaskList.reduce((acc, task) => Object.assign(acc, { [task.id]: task }), {});
    result.resultList = result.resultList.map((task) => taskMap[task.id]);

    return result;
  }

  async getScheduleTasks(userId: number, query: taskScheduleQueryDataDTO) {
    const result = { resultList: [], endOfList: true };
    const sqlWhere = [
      't2u.id IS NOT NULL', // пользователь назначен исполнителем
      't."deleteTime" IS NULL', // НЕ удалена
      't."projectId" IN (:projectIds)', // принадлежит проекту
      `t."timeType" IS DISTINCT FROM 'later'`, // НЕ относится к задачам "сделать потом"
      `(t.regular->>'enabled')::boolean IS DISTINCT FROM true`, // НЕ является регулярной (или является клоном)
      `t."execEndTime" IS NULL`, // НЕ указано время фактического исполнения
      `t2u."status" = 'exec_ready'`, // задача принята в работу
      't."endTime" >= NOW()', // задача НЕ просрочена
      't."endTime" >= :from::timestamp', // удовлетворяет запросу
      `t."endTime" <= :to::timestamp + '1 day'::interval`, // удовлетворяет запросу
    ];
    if (query.scheduleFilters) {
      query.projectIds.push(...Object.keys(query.scheduleFilters).map((projectId) => parseInt(projectId)));
    }
    const findData = await this.utils.queryDB(
      `--sql
        SELECT    t.id, t.title, t.regular, t."startTime", t."endTime", t."addTime"
        FROM      "task" AS t
                  LEFT JOIN "task_to_user" AS t2u ON  t2u."userId" = :userId
                                                  AND t2u."taskId" = t.id 
                                                  AND t2u."deleteTime" IS NULL
        WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
        ORDER BY  CASE WHEN t."timeType" = 'day' THEN 1 ELSE 0 END 
                  NULLS FIRST
      `,
      { replacements: { userId, projectIds: query.projectIds, from: query.from, to: query.to } },
    );

    result.resultList = findData[0];
    const fillDataTaskList = await this.getMany({ taskIdList: result.resultList.map((task) => task.id) });
    const taskMap = fillDataTaskList.reduce((acc, task) => Object.assign(acc, { [task.id]: task }), {});
    result.resultList = result.resultList.map((task) => taskMap[task.id]);
    if (query.scheduleFilters) {
      result.resultList = result.resultList
        .map((task) => {
          const filters = query.scheduleFilters[task.projectId];
          if (filters) {
            function applyShowFilter(task) {
              return filters.showTaskContent
                ? task
                : { id: task.id, projectId: task.projectId, startTime: task.startTime, endTime: task.endTime };
            }
            return filters.showAllTasks
              ? applyShowFilter(task)
              : task.userList.length > 1
              ? applyShowFilter(task)
              : null;
          } else {
            return task;
          }
        })
        .filter((task) => task);
    }

    return result;
  }

  async getOverdueTasks(userId: number, query: taskOverdueQueryDataDTO) {
    const result = { resultList: [], endOfList: true };
    const sqlWhere = [
      't2u.id IS NOT NULL', // пользователь назначен исполнителем
      't."deleteTime" IS NULL', // НЕ удалена
      't."projectId" IN (:projectIds)', // принадлежит проекту
      `t."timeType" IS DISTINCT FROM 'later'`, // НЕ относится к задачам "сделать потом"
      `(t.regular->>'enabled')::boolean IS DISTINCT FROM true`, // НЕ является регулярной (или является клоном)
      `t."execEndTime" IS NULL`, // НЕ указано время фактического исполнения
      't."endTime" < NOW()', // задача просрочена
    ];
    if (!query.limit) query.limit = 50;
    const findData = await this.utils.queryDB(
      `--sql
        SELECT    t.id, t.title, t.regular, t."startTime", t."endTime"
        FROM      "task" AS t
                  LEFT JOIN "task_to_user" AS t2u ON  t2u."userId" = :userId 
                                                  AND t2u."taskId" = t.id 
                                                  AND t2u."deleteTime" IS NULL
        WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
        LIMIT     :limit
        OFFSET    :offset
      `,
      { replacements: { userId, projectIds: query.projectIds, limit: query.limit + 1, offset: query.offset || 0 } },
    );

    result.resultList = findData[0];
    if (result.resultList.length < query.limit + 1) result.endOfList = true;
    else result.resultList.pop();
    const fillDataTaskList = await this.getMany({ taskIdList: result.resultList.map((task) => task.id) });
    const taskMap = fillDataTaskList.reduce((acc, task) => Object.assign(acc, { [task.id]: task }), {});
    result.resultList = result.resultList.map((task) => taskMap[task.id]);

    return result;
  }

  async getLaterTasks(userId: number, query: taskLaterQueryDataDTO) {
    const result = { resultList: [], endOfList: true };
    const sqlWhere = [
      't2u.id IS NOT NULL', // пользователь назначен исполнителем
      't."deleteTime" IS NULL', // НЕ удалена
      't."projectId" IN (:projectIds)', // принадлежит проекту
      `t."execEndTime" IS NULL`, // НЕ указано время фактического исполнения
      `t."timeType" = 'later'`, // относится к задачам "сделать потом"
    ];
    if (!query.limit) query.limit = 50;
    const findData = await this.utils.queryDB(
      `--sql
        SELECT    t.id, t.title
        FROM      "task" AS t
                  LEFT JOIN "task_to_user" AS t2u ON  t2u."userId" = :userId
                                                  AND t2u."taskId" = t.id 
                                                  AND t2u."deleteTime" IS NULL
        WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
        LIMIT     :limit
        OFFSET    :offset
      `,
      { replacements: { userId, projectIds: query.projectIds, limit: query.limit + 1, offset: query.offset || 0 } },
    );

    result.resultList = findData[0];
    if (result.resultList.length < query.limit + 1) result.endOfList = true;
    else result.resultList.pop();
    const fillDataTaskList = await this.getMany({ taskIdList: result.resultList.map((task) => task.id) });
    const taskMap = fillDataTaskList.reduce((acc, task) => Object.assign(acc, { [task.id]: task }), {});
    result.resultList = result.resultList.map((task) => taskMap[task.id]);

    return result;
  }

  async getExecutorsTasks(userId: number, query: taskExecutorsQueryDataDTO) {
    const result = { resultList: [], endOfList: true };
    const sqlWhere = [
      't."deleteTime" IS NULL', // НЕ удалена
      't."projectId" IN (:projectIds)', // принадлежит проекту
      't."ownUserId" = :userId', // пользователь является создателем
      't2u."userId" IS NOT NULL', // исполнитель назначен
      `t."execEndTime" IS NULL`, // НЕ указано время фактического исполнения
      `_t2u.id IS NULL`, // назначен всего один исполнитель
    ];
    if (!query.limit) query.limit = 50;
    const findData = await this.utils.queryDB(
      `--sql
        SELECT    t.id
                , t.title
                , t2u."userId" AS "consignedExecUserId"
                , (${sql.selectProjectToUserLink(
                  { projectId: 't."projectId"', userId: 't2u."userId"' },
                  { addUserData: true },
                )}) AS "consignedExecUserData"
        FROM      "task" AS t
                  LEFT JOIN "task_to_user" AS t2u ON  t2u."taskId" = t.id
                                                  AND t2u."deleteTime" IS NULL 
                                                  AND t2u."userId" != t."ownUserId"
                  LEFT JOIN "task_to_user" AS _t2u ON _t2u."taskId" = t.id
                                                  AND _t2u."deleteTime" IS NULL
                                                  AND _t2u."userId" != t2u."userId"
                  LEFT JOIN "project_to_user" as p2u ON p2u."userId" = t2u."userId"
                                                    AND p2u."projectId" = t."projectId"
                                                    AND p2u."deleteTime" IS NULL
                  LEFT JOIN "user" as u ON u."id" = t2u."userId"
        WHERE     ${sqlWhere.map((item) => `(${item})`).join(' AND ')}
        ORDER BY  COALESCE(p2u."userName", u."name", u."id"::VARCHAR)
                , t2u."userId"
        LIMIT     :limit
        OFFSET    :offset
      `,
      { replacements: { userId, projectIds: query.projectIds, limit: query.limit + 1, offset: query.offset || 0 } },
    );

    result.resultList = findData[0];
    if (result.resultList.length < query.limit + 1) result.endOfList = true;
    else result.resultList.pop();
    const fillDataTaskList = await this.getMany({ taskIdList: result.resultList.map((task) => task.id) });
    const taskMap = fillDataTaskList.reduce((acc, task) => Object.assign(acc, { [task.id]: task }), {});
    result.resultList = result.resultList.map((task) => ({ ...taskMap[task.id], ...task })); // в task лежит consignedExecUser

    return result;
  }

  //@Cron('0 * * * * *')
  async checkForDeleteFinished() {
    console.log('checkForDeleteFinished', new Date().toISOString());
    await this.utils.queryDB(
      `--sql
        UPDATE task SET "deleteTime" = NOW(), "updateTime" = NOW() WHERE id IN (
          SELECT    t.id
          FROM      "task" AS t, "user" AS u
          WHERE     u.id = t."ownUserId"
                AND u.config ->> 'autoDeleteFinished' IS NOT NULL
                AND t."execEndTime" + CONCAT(CAST(u.config ->> 'autoDeleteFinished' AS INTEGER), 'seconds')::interval < NOW()
                AND t."deleteTime" IS NULL
        )
        `,
    );
  }

  // @Cron('0 0 3 * * *')
  async cronCreateRegularTaskClones(transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      const nowWithShift = `NOW() + interval '${REGULAR_TASK_SHIFT_DAYS_COUNT} days'`;

      const findData = await this.utils.queryDB(`--sql
      SELECT    task.id
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
                , array(${sql.json(`--sql
                  SELECT    role, "userId", status
                  FROM      "task_to_user" AS t2u
                  WHERE     t2u."deleteTime" IS NULL AND "taskId" = task.id
                `)}) AS "userList"
      FROM      "task" as task
      WHERE     "deleteTime" IS NULL
            AND regular @> '{"enabled":true}'
            AND (
              (
                regular @> '{"rule":"day"}'
              ) OR ( 
                      regular @> '{"rule":"weekdays"}' 
                  AND regular -> 'weekdaysList' @> CAST( CAST((SELECT EXTRACT(ISODOW FROM ${nowWithShift})) AS text) as jsonb) 
              ) OR (
                      regular @> '{"rule":"week"}' 
                  AND (
                            ("endTime" IS NULL AND EXTRACT(ISODOW FROM "startTime") = EXTRACT(ISODOW FROM ${nowWithShift}))
                        OR  EXTRACT(ISODOW FROM "endTime") = EXTRACT(ISODOW FROM ${nowWithShift})                      
                      )
              ) OR (
                      regular @> '{"rule":"month"}'
                  AND (
                            ("endTime" IS NULL  AND EXTRACT(DAY FROM "startTime") = EXTRACT(DAY FROM ${nowWithShift}))
                        OR  EXTRACT(DAY FROM "endTime") = EXTRACT(DAY FROM ${nowWithShift})
                      )
              )
            )
    `);
      console.log('cronCreateRegularTaskClones', findData[0]);
      const tasksToClone = findData[0];

      if (tasksToClone.length) {
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

          this.create(newObject, transaction);
        }
      }
    });
  }

  async cloneRegularTask(taskId: number, taskData: taskFullDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
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
          await this.create(taskData, transaction);
        }

        const timeShift = theStep * 24 * 60 * 60 * 1000;
        theDate = new Date(theDate.getTime() + timeShift);
        if (theStartDate !== null) theStartDate = new Date(theStartDate.getTime() + timeShift);
        if (theEndDate !== null) theEndDate = new Date(theEndDate.getTime() + timeShift);
      }
    });
  }
}

@nestjs.Injectable({ scope: nestjs.Scope.REQUEST })
export class TaskService extends TaskServiceSingleton {
  constructor(public utils: UtilsService) {
    super(utils);
  }
}
