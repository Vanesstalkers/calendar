import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { Transaction } from 'sequelize/types';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types, exception, sql } from '../globalImport';

import { projectCreateQueryDTO, projectUpdateQueryDataDTO, projectUserLinkDTO } from './project.dto';

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
    if (createTransaction) config.transaction = transaction = await this.sequelize.transaction();

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

    if (config.personalProject) updateData.personal = true;
    await this.utils.updateDB({
      table: 'project',
      id: projectId,
      data: updateData,
      handlers: {
        userList: async (value: any) => {
          const arr: any[] = Array.from(value);
          for (const link of arr) {
            if (link.personal) delete link.personal;
            if (config.personalProject) link.personal = true;
            const userLink = await this.getUserLink(link.userId, projectId, { attributes: ['id'] });
            if (!userLink) {
              await this.upsertLinkToUser(projectId, link.userId, link, transaction);
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

  async getOne(data: { id: number; userId?: number }, config: types['getOneConfig'] = {}) {
    const findData = await this.sequelize
      .query(
        `--sql
                SELECT    p.id
                        , p.title
                        , p.personal
                        , (${sql.selectIcon('project', 'p')}) AS "iconFileId"
                        , array(
                          ${sql.selectProjectToUserLink({ projectId: ':id' }, { addUserData: true })}
                          ) AS "userList"`+
                        // , array(
                        //   SELECT    row_to_json(ROW)
                        //   FROM      (
                        //             SELECT    t."id" AS "taskId"
                        //                     , t."title"
                        //                     , t."groupId"
                        //                     , t."startTime"
                        //                     , t."endTime"
                        //                     , t."timeType"
                        //                     , t."require"
                        //                     , t."regular"
                        //                     , (
                        //                       ${sql.selectProjectToUserLink(
                        //                         { projectId: ':id', userId: '"ownUserId"' },
                        //                         { addUserData: true },
                        //                       )}
                        //                       ) AS "ownUser" 
                        //                     , array(
                        //                       SELECT    row_to_json(ROW)
                        //                       FROM      (
                        //                                 SELECT    t2u."userId"
                        //                                         , t2u."role"
                        //                                         , t2u."status"
                        //                                 FROM      "task_to_user" AS t2u
                        //                                 WHERE     t2u."deleteTime" IS NULL AND      
                        //                                           "taskId" = t.id
                        //                                 ) AS ROW
                        //                       ) AS "userList"
                        //                     , array(
                        //                       SELECT    row_to_json(ROW)
                        //                       FROM      (
                        //                                 SELECT    id
                        //                                         , name
                        //                                 FROM      "hashtag"
                        //                                 WHERE     "deleteTime" IS NULL AND      
                        //                                           "taskId" = t.id
                        //                                 ) AS ROW
                        //                       ) AS "hashtagList"
                        //                     , (
                        //                       SELECT    COUNT(id)
                        //                       FROM      "comment"
                        //                       WHERE     "deleteTime" IS NULL AND      
                        //                                 "taskId" = t.id
                        //                       ) AS "commentCount"
                        //                     , array(
                        //                       SELECT    row_to_json(ROW)
                        //                       FROM      (
                        //                                 SELECT    "id" AS "fileId"
                        //                                         , "fileType"
                        //                                 FROM      "file"
                        //                                 WHERE     "deleteTime" IS NULL AND      
                        //                                           "parentId" = t.id AND      
                        //                                           "parentType" = 'task'
                        //                                 ) AS ROW
                        //                       ) AS "fileList"
                        //             FROM      "task" AS t
                        //             LEFT JOIN "task_to_user" AS t2u ON t2u."taskId" = t.id AND      
                        //                       t2u."userId" = :userId AND      
                        //                       t2u."deleteTime" IS NULL
                        //             WHERE     t."deleteTime" IS NULL AND      
                        //                       t."projectId" = p.id AND      
                        //                       (
                        //                       t2u."id" IS NOT NULL OR       
                        //                       t."ownUserId" = :userId
                        //                       )
                        //             ) AS ROW
                        //   ) AS "taskList"
                `--sql
                FROM      "project" AS p
                WHERE     p.id = :id AND      
                          p."deleteTime" IS NULL
                LIMIT    
                          1
        `,
        {
          type: QueryTypes.SELECT,
          replacements: { id: data.id || null, userId: data.userId },
        },
      )
      .catch(exception.dbErrorCatcher);

    return findData[0] || null;
  }

  async checkExists(id: number) {
    const findData = await this.projectModel
      .findOne({ where: { id }, attributes: ['id'] })
      .catch(exception.dbErrorCatcher);
    return findData ? true : false;
  }

  async upsertLinkToUser(projectId: number, userId: number, linkData: projectUserLinkDTO, transaction?: Transaction) {
    const createTransaction = !transaction;
    if (createTransaction) transaction = await this.sequelize.transaction();

    const link = await this.projectToUserModel
      .upsert({ projectId, userId }, { conflictFields: ['projectId', 'userId'], transaction })
      .catch(exception.dbErrorCatcher);
    await this.updateUserLink(link[0].id, linkData, transaction);

    if (createTransaction) await transaction.commit();
    return link[0];
  }

  async updateUserLink(linkId: number, updateData: projectUserLinkDTO, transaction?: Transaction) {
    if (!updateData.deleteTime) updateData.deleteTime = null;
    await this.utils.updateDB({ table: 'project_to_user', id: linkId, data: updateData, transaction });
  }

  async getUserLink(userId: number, projectId: number, config: types['getOneConfig'] = {}) {
    if (!config.attributes) config.attributes = ['*'];
    const findData = await this.sequelize
      .query(
        `--sql
        SELECT ${config.attributes.join(',')} 
        FROM "project_to_user"
        WHERE "userId" = :userId AND "projectId" = :projectId AND "deleteTime" IS NULL
      `,
        { replacements: { userId, projectId }, type: QueryTypes.SELECT },
      )
      .catch(exception.dbErrorCatcher);
    return findData[0] || null;
  }

  async checkUserLinkExists(userId: number, projectId: number) {
    const link = await this.getUserLink(userId, projectId, { attributes: ['id'] }).catch(exception.dbErrorCatcher);
    return link ? true : false;
  }

  async getPersonalOwner(projectId: number) {
    const findData = await this.sequelize
      .query(
        `--sql
        SELECT "userId"
        FROM "project_to_user"
        WHERE "projectId" = :projectId AND "personal" = true AND "role" = 'owner' AND "deleteTime" IS NULL
      `,
        { replacements: { projectId }, type: QueryTypes.SELECT },
      )
      .catch(exception.dbErrorCatcher);
    return findData[0]?.userId || null;
  }
}
