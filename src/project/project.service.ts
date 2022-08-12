import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { Transaction } from 'sequelize/types';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types, exception } from '../globalImport';

import { projectCreateQueryDTO, projectUpdateQueryDataDTO } from './project.dto';

import { UtilsService } from '../utils/utils.service';

@nestjs.Injectable()
export class ProjectService {
  constructor(
    private sequelize: Sequelize,
    @sequelize.InjectModel(models.project)
    private projectModel: typeof models.project,
    @sequelize.InjectModel(models.project2user)
    private projectToUserModel: typeof models.project2user,
    private utils: UtilsService,
  ) {}

  async create(
    projectData: projectCreateQueryDTO,
    config: { transaction?: Transaction; personalProject?: boolean } = {},
  ) {
    let transaction = config.transaction;
    const createTransaction = !transaction;
    if (createTransaction) transaction = await this.sequelize.transaction();

    const project = await this.projectModel.create({}, { transaction }).catch(exception.dbErrorCatcher);
    await this.update(project.id, projectData, config);

    if (createTransaction) await transaction.commit();
    return project;
  }
  async update(
    projectId: number,
    updateData: projectUpdateQueryDataDTO,
    config: { transaction?: Transaction; personalProject?: boolean } = {},
  ) {
    const transaction = config.transaction;

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
            const userLink = await this.getUserLink(link.userId, projectId, { checkExists: true });
            if (!userLink) {
              await this.createUserLink(projectId, link.userId, link, transaction);
            } else {
              await this.updateUserLink(userLink.id, link, transaction);
            }
          }
          return { preventDefault: true };
        },
      },
      transaction,
    });
  }

  async getOne(
    data: { id: number },
    config: { checkExists?: boolean; include?: boolean; attributes?: string[] } = {},
  ): Promise<any> {
    if (config.checkExists) {
      config.include = false;
      config.attributes = ['id'];
    }

    const findData = await this.sequelize
      .query(
        `--sql
        SELECT    p.title
        , p.config
        , array(
          SELECT    row_to_json(ROW)
          FROM      (
                    SELECT    "userId"
                            , "role"
                            , "personal"
                            , "userName"
                            , (
                              SELECT    "id"
                              FROM      "file"
                              WHERE     "deleteTime" IS NULL AND      
                                        "parentId" = p2u.id AND      
                                        "parentType" = 'project_to_user' AND      
                                        "fileType" = 'icon'
                              ORDER BY  "addTime" DESC
                              LIMIT    
                                        1
                              ) AS "userIconFileId"
                            , u."name" AS "baseUserName"
                            , (
                              SELECT    "id"
                              FROM      "file"
                              WHERE     "deleteTime" IS NULL AND      
                                        "parentId" = u.id AND      
                                        "parentType" = 'user' AND      
                                        "fileType" = 'icon'
                              ORDER BY  "addTime" DESC
                              LIMIT    
                                        1
                              ) AS "baseUserIconFileId"
                    FROM      "project_to_user" AS p2u
                    LEFT JOIN "user" AS u ON u.id = p2u."userId" AND      
                              u."deleteTime" IS NULL
                    WHERE     p2u."deleteTime" IS NULL AND      
                              "projectId" = p.id
                    ) AS ROW
          ) AS "userList"
        , array(
          SELECT    row_to_json(ROW)
          FROM      (
                    SELECT    "id"
                            , "require"
                            , "title"
                            , "startTime"
                            , "endTime"
                            , "timeType"
                            , "regular"
                            , "groupId"
                            , array(
                              SELECT    row_to_json(ROW)
                              FROM      (
                                        SELECT    t2u."userId"
                                                , t2u."role"
                                                , p2u."userName"
                                                , u."name" AS "baseUserName"
                                                , (
                                                  SELECT    "id"
                                                  FROM      "file"
                                                  WHERE     "deleteTime" IS NULL AND      
                                                            "parentId" = u.id AND      
                                                            "parentType" = 'user' AND      
                                                            "fileType" = 'icon'
                                                  ORDER BY  "addTime" DESC
                                                  LIMIT    
                                                            1
                                                  ) AS "baseUserIconFileId"
                                        FROM      "task_to_user" AS t2u
                                        LEFT JOIN "user" AS u ON u.id = t2u."userId" AND      
                                                  u."deleteTime" IS NULL
                                        LEFT JOIN "project_to_user" AS p2u ON u.id = p2u."userId" AND      
                                                  p.id = p2u."projectId" AND      
                                                  u."deleteTime" IS NULL
                                        WHERE     t2u."deleteTime" IS NULL AND      
                                                  "taskId" = t.id
                                        ) AS ROW
                              ) AS "userList"
                            , (
                              SELECT    COUNT(id)
                              FROM      "comment"
                              WHERE     "taskId" = t.id
                              ) AS "commentCount"
                            , array(
                              SELECT    row_to_json(ROW)
                              FROM      (
                                        SELECT    "id"
                                        FROM      "file"
                                        WHERE     "deleteTime" IS NULL AND      
                                                  "parentId" = t.id AND      
                                                  "parentType" = 'task'
                                        ) AS ROW
                              ) AS "fileList"
                    FROM      "task" AS t
                    WHERE     "deleteTime" IS NULL AND      
                              "projectId" = p.id
                    ) AS ROW
          ) AS "taskList"
FROM      "project" AS p
WHERE     p.id = 36 AND      
          p."deleteTime" IS NULL
LIMIT    
          1
        `,
        {
          type: QueryTypes.SELECT,
          replacements: { id: data.id || null },
        },
      )
      .catch(exception.dbErrorCatcher);

    return findData || null;
  }

  async checkExists(id: number) {
    const project = await this.getOne({ id }, { checkExists: true }).catch(exception.dbErrorCatcher);
    return project ? true : false;
  }

  async createUserLink(
    projectId: number,
    userId: number,
    linkData: types['models']['project2user'],
    transaction?: Transaction,
  ) {
    const createTransaction = !transaction;
    if (createTransaction) transaction = await this.sequelize.transaction();

    const link = await this.projectToUserModel
      .create({ projectId, userId }, { transaction })
      .catch(exception.dbErrorCatcher);
    await this.updateUserLink(link.id, linkData, transaction);

    if (createTransaction) await transaction.commit();
    return link;
  }

  async updateUserLink(linkId: number, updateData: types['models']['project2user'], transaction: Transaction) {
    await this.utils.updateDB({ table: 'project_to_user', id: linkId, data: updateData, transaction });
  }

  async getUserLink(userId: number, projectId: number, config: { attributes?: string[]; checkExists?: boolean } = {}) {
    if (config.checkExists) {
      config.attributes = ['id'];
    }
    const findData = await this.sequelize
      .query(
        `--sql
        SELECT ${(config.attributes || ['*']).join(',')} 
        FROM "project_to_user"
        WHERE "userId" = :userId AND "projectId" = :projectId
      `,
        { replacements: { userId, projectId }, type: QueryTypes.SELECT },
      )
      .catch(exception.dbErrorCatcher);
    return findData[0] || null;
  }

  async checkUserLinkExists(userId: number, projectId: number) {
    const link = await this.getUserLink(userId, projectId, { checkExists: true }).catch(exception.dbErrorCatcher);
    return link ? true : false;
  }
}
