import * as nestjs from '@nestjs/common';
import { QueryTypes } from 'sequelize';
import { UtilsService, UtilsServiceSingleton } from 'src/utils/utils.service';
import { EventsGateway } from './events/events.gateway';
import { exception, types, sql } from './globalImport';

import { Db, ObjectID } from 'mongodb';
import Redis from 'ioredis';
const redisPub = new Redis();
const redisSub = new Redis();
redisSub.subscribe('updateData');

import { projectUpdateQueryDataDTO } from './project/project.dto';

@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class AppUpdatesSubscribeList {
  add(type: string, id: number, subscriberCode: string) {
    if (type && this[type] && id && subscriberCode) {
      const list = this[type];
      if (!list[id]) list[id] = {};
      list[id][subscriberCode] = true;
    }
  }
  project = {};
  user = {};
}
@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class AppUserStore {
  store = {};
  phoneAlias = {};
}
@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class AppProjectStore {
  store = {};
}
@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class AppProjectToUserStore {
  store = {};
}
@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class AppTaskStore {
  store = {};
}

@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class AppRepositorySingleton {
  constructor(
    @nestjs.Inject('DATABASE_CONNECTION') public db: Db,
    public utils: UtilsServiceSingleton,
    public events: EventsGateway,
    public subscribeList: AppUpdatesSubscribeList,
    public users: AppUserStore,
    public projects: AppProjectStore,
    public p2u: AppProjectToUserStore,
    public tasks: AppTaskStore,
  ) {
    if (!(this instanceof AppRepository)) {
      redisSub.on('message', (channel, message) => {
        if (channel === 'updateData') {
          const { entityType, entityId, data } = JSON.parse(message);
          if (entityType && entityId && data) this.broadcastUpdates(entityType, entityId, data);
        }
      });
    }
  }
  getSubscribeList(subscriberCode: string) {
    const result = {};
    for (const [entityType, entityIds] of Object.entries(this.subscribeList)) {
      for (const [id, subscriberCodes] of Object.entries(entityIds)) {
        if (subscriberCodes[subscriberCode]) {
          if (!result[entityType]) result[entityType] = [];
          result[entityType].push(id);
        }
      }
    }
    return result;
  }
  broadcastUpdates(entityType: string, entityId: number, data: any) {
    const subscribers = Object.keys(this.subscribeList[entityType][entityId] || {});
    if (subscribers && subscribers.length) {
      for (const sessionId of subscribers) {
        const eventsId = this.events.sessionsMap[sessionId];
        if (eventsId) {
          const ws = this.events.server.of('/').sockets.get(eventsId);
          if (ws) ws.emit('updateData', JSON.stringify({ entityId, entityType, data }));
        }
      }
    }
  }

  async getUser(
    { userId, phone }: { userId: number; phone?: string },
    { subscriberCode }: { subscriberCode?: string } = {},
  ) {
    this.subscribeList.add('user', userId, subscriberCode);

    const phoneAlias = phone && this.users.phoneAlias[phone];
    const cachedUser = this.users.store[userId || phoneAlias];
    if (cachedUser) {
      const filledUserList = [];
      for (const entry of Object.entries(cachedUser.projectList)) {
        const [idx, id]: [string, any] = entry;
        filledUserList[idx] = this.p2u.store[id];
      }
      return { ...cachedUser, projectList: filledUserList };
    } else {
      const [user] = await this.utils.queryDB(
        `--sql
          SELECT    u.id
                  , u.name
                  , u.phone
                  , u.timezone
                  , u.config
                  , CAST(u.config ->> 'iconFileId' AS INTEGER) AS "iconFileId"
                  , u.sessions
                  , array(
                      ${sql.selectProjectToUserLink({ userId: 'u.id' }, { addProjectData: true, showLinkConfig: true })}
                    ) AS "projectList"
                  , array(
                    SELECT    row_to_json(ROW)
                    FROM      (
                                SELECT    p2u."id" AS "projectToUserLinkId"
                                        , "userId"
                                        , "projectId"
                                        , "role"
                                        , "position"
                                        , p2u."personal"
                                        , "userName"
                                        , (CASE WHEN p2u.config ->> 'userIconFileId' IS NOT NULL
                                            THEN CAST(p2u.config ->> 'userIconFileId' AS INTEGER)
                                            ELSE (
                                              SELECT "id" FROM "file"
                                              WHERE "parentId" = p2u."userId" AND "parentType" = 'user' AND "fileType" = 'icon' AND "deleteTime" IS NULL
                                              ORDER BY "addTime" DESC LIMIT 1
                                            )  
                                          END) AS "userIconFileId"
                                FROM      "project_to_user" p2u
                                WHERE     p2u."projectId" = (u.config ->> 'personalProjectId')::integer 
                                      AND p2u."userId" != u.id
                              ) AS ROW
                    ) AS "contactList"
          FROM      "user" AS u
          WHERE     (u.id = :id OR u.phone = :phone)
                AND u."deleteTime" IS NULL
          LIMIT     1
        `,
        {
          type: QueryTypes.SELECT,
          replacements: { id: userId || null, phone: phone || null },
        },
      );

      if (user) {
        this.users.store[user.id] = { ...user };
        this.users.phoneAlias[user.phone] = user.id;
        if (user.projectList) {
          const simplifiedProjectList = [];
          for (const entry of Object.entries(user.projectList)) {
            const [idx, projectList]: [string, any] = entry;
            const p2uId = projectList.projectToUserLinkId;
            this.p2u.store[p2uId] = projectList;
            simplifiedProjectList[idx] = p2uId;
          }
          this.users.store[user.id].projectList = simplifiedProjectList;
        }
        return user;
      } else {
        return null;
      }
    }
  }
  updateUser(id, data) {}
  async getProject({ projectId }, { subscriberCode }: { subscriberCode?: string } = {}) {
    this.subscribeList.add('project', projectId, subscriberCode);

    const cachedProject = this.projects.store[projectId];
    if (cachedProject) {
      const filledUserList = [];
      for (const entry of Object.entries(cachedProject.userList)) {
        const [idx, userLinkId]: [string, any] = entry;
        const userLink = this.p2u.store[userLinkId];
        if (!userLink.userIconFileId) {
          const userId = userLink.userId;
          userLink.userIconFileId = this.users.store[userId].iconFileId;
        }
        filledUserList[idx] = userLink;
      }
      return { ...cachedProject, userList: filledUserList };
    } else {
      const [project] = await this.utils.queryDB(
        `--sql
          SELECT    p.id
                  , p.title
                  , p.personal
                  , p.config
                  , CAST(p.config ->> 'iconFileId' AS INTEGER) AS "iconFileId"
                  , array(
                    ${sql.selectProjectToUserLink({ projectId: ':id' }, { addUserData: true, showLinkConfig: true })}
                  ) AS "userList"
          FROM      "project" AS p
          WHERE     p.id = :id
                AND p."deleteTime" IS NULL
          LIMIT     1
        `,
        {
          type: QueryTypes.SELECT,
          replacements: { id: projectId || null },
        },
      );

      if (project) {
        this.projects.store[project.id] = { ...project };
        if (project.userList) {
          // загружаем все необходимые отсутствующие в store сущности
          for (const { userId } of project.userList) await this.getUser({ userId });

          const simplifiedUserList = [];
          for (const entry of Object.entries(project.userList)) {
            const [idx, userLink]: [string, any] = entry;
            this.p2u.store[userLink.projectToUserLinkId] = userLink;
            simplifiedUserList[idx] = userLink.projectToUserLinkId;
          }
          this.projects.store[project.id].userList = simplifiedUserList;
        }
        return project;
      } else {
        return null;
      }
    }
  }
  updateProject(projectId: number, projectData: projectUpdateQueryDataDTO) {
    redisPub.publish('updateData', JSON.stringify({ entityType: 'project', entityId: projectId, data: projectData }));

    if (this.projects.store[projectId]) {
      if (projectData.userList) {
        for (const entry of Object.entries(projectData.userList)) {
          const [idx, updates]: [string, any] = entry;
          const [p2uId, p2uLinkInRepo] =
            Object.entries(this.p2u.store).find(
              ([id, link]: [string, any]) => link.projectId === projectId && link.userId === updates.userId,
            ) || [];
          if (p2uLinkInRepo) {
            this.utils.updateObjRecursive(p2uLinkInRepo, updates);
          } else {
            /// ??? тут добавление
          }
        }
        delete projectData.userList;
      }
      this.utils.updateObjRecursive(this.projects.store[projectId], projectData);
    }
  }

  async getActiveTasks({ userId, projectIds }) {
    if (!this.tasks.store[userId]) this.tasks.store[userId] = {};
    const getProjectsFromDB = [];
    for (const projectId of projectIds) {
      if (!this.tasks.store[userId][projectId]) getProjectsFromDB.push(projectId);
    }

    if (getProjectsFromDB.length) {
      // загружаем все необходимые отсутствующие в store сущности
      for (const projectId of getProjectsFromDB) await this.getProject({ projectId });

      const [taskList] = await this.utils.queryDB(
        `--sql
          SELECT      t."id"
                    , t."title"
                    , t."info"
                    , t."projectId"
                    , t."groupId"
                    , t."startTime"
                    , t."endTime"
                    , t."timeType"
                    , t."require"
                    , t."regular"
                    , t."extDestination"
                    , t."execEndTime"
                    , t."execUserId"
                    , t."deleteTime"
                    , t."ownUserId"
                    , array(${sql.json(`--sql
                      SELECT    "id", "role", "userId", "status"
                      FROM      "task_to_user"
                      WHERE     "taskId" = t.id AND "deleteTime" IS NULL
                    `)}) AS "userList"
                    , array(${sql.json(`--sql
                      SELECT    "id" AS "tickId", "text", "status"
                      FROM      "tick"
                      WHERE     "taskId" = t.id AND "deleteTime" IS NULL
                    `)}) AS "tickList"
                    , array(${sql.json(`--sql
                      SELECT    id AS "commentId", "text"
                              , array(${sql.json(`--sql
                                SELECT    "id" AS "fileId", "fileType"
                                FROM      "file"
                                WHERE     "parentId" = comment.id AND "parentType" = 'comment' AND "deleteTime" IS NULL
                              `)}) AS "fileList"
                      FROM      "comment" AS comment
                      WHERE     "taskId" = t.id AND "deleteTime" IS NULL
                    `)}) AS "commentList"
                    , array(${sql.json(`--sql
                      SELECT    id AS "hashtagId", "name"
                      FROM      "hashtag"
                      WHERE     "taskId" = t.id AND "deleteTime" IS NULL
                    `)}) AS "hashtagList"
                    , array(${sql.json(`--sql
                      SELECT    id AS "fileId", "fileType"
                      FROM      "file" AS taskFile
                      WHERE     "parentId" = t.id AND "parentType" = 'task' AND "deleteTime" IS NULL
                    `)}) AS "fileList"
          FROM      "task" AS t
                    LEFT JOIN "task_to_user" AS t2u ON  t2u."taskId" = t.id 
                                                    AND t2u."userId" = :userId
                                                    AND t2u."deleteTime" IS NULL
          WHERE     "projectId" IN (:projectIds)
                AND t."deleteTime" IS NULL
                AND (t."regular"->>'enabled')::boolean IS DISTINCT FROM true
                AND (t."ownUserId" = :userId OR t2u.id IS NOT NULL)
                AND (t."execEndTime" IS NULL OR (t2u."role" = 'control' AND t2u."status" IS DISTINCT FROM 'control_ready'))
          GROUP BY  t.id, t.title
        `,
        { replacements: { userId, projectIds: getProjectsFromDB } },
      );

      const userStore = this.tasks.store[userId];
      const updateList = [];
      for (const task of taskList) {
        // >>> чтобы отключить кэш, комментруем это
        if (!userStore[task.projectId]) userStore[task.projectId] = {};
        const projectStore = userStore[task.projectId];
        projectStore[task.id] = {};
        // <<<
        updateList.push({ updateOne: { filter: { id: task.id }, update: { $set: task }, upsert: true } });
      }
      await this.db.collection('tasks').bulkWrite(updateList);
    }

    const taskIdList = Object.entries(this.tasks.store[userId]).reduce((acc, [projectId, taskMap]) => {
      return acc.concat(Object.keys(taskMap).map((id) => parseInt(id)));
    }, []);
    const taskList = await this.db.collection('tasks').find({ id: { $in: taskIdList } });

    // !!! для снидения нагрузки на сервер нужно перенести checkTaskContainer в запрос для mongo
    // taskList.sort({timeType: -1});
    // taskList.skip(0);
    // taskList.limit(3);

    return taskList.toArray();
  }
  async getInboxNewTasks({ userId, projectIds }, queryConfig) {
    const taskList = await this.getActiveTasks({ userId, projectIds });
    return this.fillResult(
      taskList.filter((task) => {
        const { type, filter } = this.checkTaskContainer(task, userId);
        return type === 'inbox' && filter === 'new';
      }),
      queryConfig,
    );
  }
  async getInboxToExecTasks({ userId, projectIds }, queryConfig) {
    const taskList = await this.getActiveTasks({ userId, projectIds });
    return this.fillResult(
      taskList.filter((task) => {
        const { type, filter } = this.checkTaskContainer(task, userId);
        return type === 'inbox' && filter === 'toexec';
      }),
      queryConfig,
    );
  }
  async getScheduleTasks({ userId, projectIds, from, to }, queryConfig = {}) {
    const taskList = await this.getActiveTasks({ userId, projectIds });
    const dateFrom = new Date(from);
    const dateTo = new Date(new Date(to).setHours(23, 59, 59, 999));
    const result = this.fillResult(
      taskList.filter((task) => {
        const { type, filter } = this.checkTaskContainer(task, userId);
        const taskDate = new Date(task.endTime);
        return type === 'schedule' && taskDate >= dateFrom && taskDate <= dateTo;
      }),
      { offset: 0, limit: 1000, sortFunc: (a, b) => (a.timeType === 'day' ? 1 : -1) },
    );
    return result;
  }
  async getOverdueTasks({ userId, projectIds }, queryConfig) {
    const taskList = await this.getActiveTasks({ userId, projectIds });
    return this.fillResult(
      taskList.filter((task) => this.checkTaskContainer(task, userId).type === 'overdue'),
      queryConfig,
    );
  }
  async getLaterTasks({ userId, projectIds }, queryConfig) {
    const taskList = await this.getActiveTasks({ userId, projectIds });
    return this.fillResult(
      taskList.filter((task) => this.checkTaskContainer(task, userId).type === 'later'),
      queryConfig,
    );
  }
  async getExecutorsTasks({ userId, projectIds }, queryConfig) {
    const taskList = await this.getActiveTasks({ userId, projectIds });
    return this.fillResult(
      taskList.filter((task) => this.checkTaskContainer(task, userId).type === 'executor'),
      {
        ...queryConfig,
        sortFunc: (a, b) => (a.userList[0].userName.toUpperCase() > b.userList[0].userName.toUpperCase() ? 1 : -1),
      },
    );
  }

  async getFinishedTasks({ userId, projectIds }) {}
  checkTaskContainer(task, ownUserId): { type: string; filter?: string } {
    // !!! проверить регулярные задачи

    let hasEndTime,
      hasExecEndTime,
      isOverdue,
      isLater,
      isRegular,
      isMeeting,
      hasExecutor,
      taskExecutorIsNotOwner,
      isTakenToWorkByExecutor,
      isOnControl;
    const executors = task.userList.filter((userLink) => userLink.role === 'exec');
    const controllers = task.userList.filter((userLink) => userLink.role === 'control');
    if (task.endTime) {
      hasEndTime = true;
      if (new Date(task.endTime) < new Date()) isOverdue = true;
    }
    if (task.execEndTime) hasExecEndTime = true;
    if (task.timeType === 'later') isLater = true;
    if (task.regular.enabled !== undefined) isRegular = true;
    if (executors.length > 1) {
      isMeeting = true;
    } else {
      const executor = executors.find((userLink) => userLink.role === 'exec');
      if (executor) {
        hasExecutor = true;
        if (executor.userId !== task.ownUserId) taskExecutorIsNotOwner = true;
        if (executor.status === 'exec_ready') isTakenToWorkByExecutor = true;
        if (controllers.length) isOnControl = true;
      }
    }

    if (isLater) return { type: 'later' };
    if (isRegular) return { type: 'schedule' };
    if (!task.execEndTime && isOverdue) return { type: 'overdue' };
    if (hasExecutor && taskExecutorIsNotOwner && task.ownUserId === ownUserId && !isOnControl)
      return { type: 'executor' };
    if (hasEndTime && (isTakenToWorkByExecutor || isMeeting)) return { type: 'schedule' };

    if (taskExecutorIsNotOwner && !isOnControl) return { type: 'inbox', filter: 'toexec' };
    return { type: 'inbox', filter: 'new' };
  }
  fillResult(taskList, { offset = 0, limit = 50, sortFunc = null }) {
    const result = { resultList: [], endOfList: false };
    result.resultList = taskList.splice(offset, limit + 1);
    if (result.resultList.length < limit + 1) result.endOfList = true;
    else result.resultList.pop();
    this.fillData(result.resultList);
    if (typeof sortFunc === 'function') result.resultList.sort(sortFunc);
    return result;
  }
  fillData(taskList) {
    for (const task of taskList) {
      try {
        delete task._id; // mongo id
        const ownUserProjectLink: any = Object.values(this.p2u.store).find(
          (link: any) => link.userId === task.ownUserId && link.projectId === task.projectId,
        );
        task.ownUser = {
          projectToUserLinkId: ownUserProjectLink.projectToUserLinkId,
          userId: ownUserProjectLink.userId,
          projectId: ownUserProjectLink.projectId,
          role: ownUserProjectLink.role,
          position: ownUserProjectLink.position,
          personal: ownUserProjectLink.personal,
          userName: ownUserProjectLink.userName,
          userIconFileId: ownUserProjectLink.userIconFileId,
        };

        for (const entry of Object.entries(task.userList)) {
          const [idx, userLink]: [string, any] = entry;
          const userProjectLink: any = Object.values(this.p2u.store).find(
            (link: any) => link.userId === userLink.userId && link.projectId === task.projectId,
          );
          task.userList[idx] = {
            id: userLink.id,
            role: userLink.role,
            userId: userLink.userId,
            status: userLink.status,
            projectToUserLinkId: userProjectLink.projectToUserLinkId,
            projectId: userProjectLink.projectId,
            position: userProjectLink.position,
            personal: userProjectLink.personal,
            userName: userProjectLink.userName,
            userIconFileId: userProjectLink.userIconFileId,
          };
        }
      } catch (e) {
        throw e;
      }
    }
    return taskList;
  }
}

@nestjs.Injectable({ scope: nestjs.Scope.REQUEST })
export class AppRepository extends AppRepositorySingleton {
  constructor(
    @nestjs.Inject('DATABASE_CONNECTION') public db: Db,
    public utils: UtilsService,
    public events: EventsGateway,
    public subscribeList: AppUpdatesSubscribeList,
    public users: AppUserStore,
    public projects: AppProjectStore,
    public p2u: AppProjectToUserStore,
    public tasks: AppTaskStore,
  ) {
    super(db, utils, events, subscribeList, users, projects, p2u, tasks);
  }
}
