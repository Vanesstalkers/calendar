import * as nestjs from '@nestjs/common';
import { QueryTypes } from 'sequelize';
import { Transaction } from 'sequelize/types';
import { decorators, interfaces, types, exception, sql } from '../globalImport';

import { projectCreateQueryDTO, projectUpdateQueryDataDTO, projectUserLinkDTO } from './project.dto';

import { UtilsService, UtilsServiceSingleton } from '../utils/utils.service';
import { FileService, FileServiceSingleton } from '../file/file.service';

@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class ProjectServiceSingleton {
  constructor(public utils: UtilsServiceSingleton, public fileService: FileServiceSingleton) {}

  async create(
    projectData: projectCreateQueryDTO,
    config: { personalProject?: boolean } = {},
    transaction?: Transaction,
  ) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      const createData = await this.utils.queryDB(
        `INSERT INTO "project" ("addTime", "updateTime") VALUES (NOW(), NOW()) RETURNING id`,
        {
          type: QueryTypes.INSERT,
          replacements: {},
          transaction,
        },
      );
      const project = createData[0][0];
      await this.update(project.id, projectData, config, transaction);
      return project;
    });
  }
  async update(
    projectId: number,
    updateData: projectUpdateQueryDataDTO,
    config: { personalProject?: boolean } = {},
    transaction?: Transaction,
  ) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      if (config.personalProject) updateData.personal = true;
      await this.utils.updateDB({
        table: 'project',
        id: projectId,
        data: updateData,
        jsonKeys: ['config'],
        handlers: {
          userList: async (value: any) => {
            const arr: any[] = Array.from(value);
            for (const link of arr) {
              if (link.personal) delete link.personal;
              if (config.personalProject) link.personal = true;
              await this.upsertLinkToUser(projectId, link.userId, link, transaction);
            }
            return { preventDefault: true };
          },
        },
        transaction,
      });
    });
  }

  async transfer({ projectId, fromUserId, toUserId, fromUserLinkId, toUserLinkId }, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      await this.updateUserLink(toUserLinkId, { role: 'owner' }, transaction);
      await this.deleteUserWithTasks(
        { projectId, userId: fromUserId, projectToUserLinkId: fromUserLinkId },
        transaction,
      );
    });
  }

  async getOne(data: { id: number; userId?: number }, config: types['getOneConfig'] = {}) {
    const findData = await this.utils.queryDB(
      `--sql
        SELECT    p.id
                , p.title
                , p.personal
                , (${sql.selectIcon('project', 'p')}) AS "iconFileId"
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
        replacements: { id: data.id || null, userId: data.userId },
      },
    );

    return findData[0] || null;
  }

  async checkExists(id: number) {
    const findData = await this.utils.queryDB(
      `--sql
        SELECT "id" FROM "project" WHERE "id" = :id AND "deleteTime" IS NULL LIMIT 1
        `,
      { type: QueryTypes.SELECT, replacements: { id } },
    );
    return findData ? true : false;
  }

  async upsertLinkToUser(projectId: number, userId: number, linkData: projectUserLinkDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      const upsertData = await this.utils.queryDB(
        `--sql
          INSERT INTO  "project_to_user" 
                        ("projectId", "userId", "addTime", "updateTime") 
                VALUES  (:projectId, :userId, NOW(), NOW())
          ON CONFLICT   ("projectId", "userId") 
          DO UPDATE SET "projectId" = EXCLUDED."projectId"
                      , "userId" = EXCLUDED."userId"
                      , "updateTime" = EXCLUDED."updateTime" 
          RETURNING     "id"
      `,
        {
          type: QueryTypes.INSERT, // c QueryTypes.UPSERT не возвращает данные
          replacements: { projectId, userId },
          transaction,
        },
      );
      const link = upsertData[0][0];
      await this.updateUserLink(link.id, linkData, transaction);
      return link;
    });
  }

  async updateUserLink(linkId: number, updateData: projectUserLinkDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      if (!updateData.deleteTime) updateData.deleteTime = null;
      await this.utils.updateDB({
        table: 'project_to_user',
        id: linkId,
        data: updateData,
        jsonKeys: ['config'],
        handlers: {
          iconFile: async (value: any) => {
            await this.fileService.create(
              Object.assign(value, { parentType: 'project_to_user', parentId: linkId, fileType: 'icon' }),
              transaction,
            );
            return { preventDefault: true };
          },
        },
        transaction,
      });
    });
  }

  async deleteUserWithTasks({ projectId, userId, projectToUserLinkId }, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      await this.updateUserLink(projectToUserLinkId, { deleteTime: new Date() }, transaction);
      await this.utils.queryDB(
        `--sql
          WITH  owner     AS (
                  SELECT    "userId" 
                  FROM      project_to_user 
                  WHERE     "projectId" = :projectId AND "role" = 'owner' AND "deleteTime" IS NULL
                ),
                taskList  AS (
                  SELECT    t.id
                  FROM      task t 
                            LEFT JOIN task_to_user t2u ON t2u."taskId" = t."id" AND t2u."deleteTime" IS NULL
                  WHERE     t."projectId" = :projectId
                        AND (t."ownUserId" = :userId OR t2u."userId" = :userId) 
                        AND t."deleteTime" IS NULL
                )
          UPDATE    "task"
          SET       "ownUserId" = (SELECT "userId" FROM owner)
                  , "startTime" = NULL
                  , "endTime" = NULL
                  , "updateTime" = NOW()
          WHERE     "id" IN (SELECT "id" FROM taskList)
                AND "deleteTime" IS NULL;

          UPDATE    "task_to_user" as t2u
          SET       "deleteTime" = NOW(), "updateTime" = NOW()
          FROM      task as t
          WHERE     t."id" = t2u."taskId"
                AND t2u."userId" = :userId
                AND t."projectId" = :projectId
                AND t2u."deleteTime" IS NULL;
        `,
        { replacements: { userId, projectId }, type: QueryTypes.SELECT, transaction },
      );
    });
  }

  async getUserLink(userId: number, projectId: number, config: types['getOneConfig'] = {}) {
    if (!config.attributes) config.attributes = ['*'];
    const findData = await await this.utils.queryDB(
      `--sql
        SELECT    ${config.attributes.join(',')} 
        FROM      "project_to_user"
        WHERE     "userId" = :userId
              AND "projectId" = :projectId
              AND "deleteTime" IS NULL
      `,
      { replacements: { userId, projectId }, type: QueryTypes.SELECT },
    );
    return findData[0] || null;
  }

  async checkUserLinkExists(userId: number, projectId: number) {
    return (await this.getUserLink(userId, projectId, { attributes: ['id'] })) ? true : false;
  }

  async getPersonalOwner(projectId: number) {
    const findData = await this.utils.queryDB(
      `--sql
        SELECT    "userId"
        FROM      "project_to_user"
        WHERE     "projectId" = :projectId
              AND "personal" = true
              AND "role" = 'owner'
              AND "deleteTime" IS NULL
      `,
      { replacements: { projectId }, type: QueryTypes.SELECT },
    );
    return findData[0]?.userId || null;
  }
}

@nestjs.Injectable({ scope: nestjs.Scope.REQUEST })
export class ProjectService extends ProjectServiceSingleton {
  constructor(public utils: UtilsService, public fileService: FileService) {
    super(utils, fileService);
  }
}
