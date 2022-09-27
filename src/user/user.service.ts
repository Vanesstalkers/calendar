import * as nestjs from '@nestjs/common';
import { QueryTypes } from 'sequelize';
import { Transaction } from 'sequelize/types';
import { exception, types, sql } from '../globalImport';

import { ProjectService } from '../project/project.service';
import { UtilsService } from '../utils/utils.service';
import { FileService } from '../file/file.service';

import { userAuthQueryDataDTO, userSearchQueryDTO, userUpdateQueryDataDTO } from './user.dto';

@nestjs.Injectable()
export class UserService {
  constructor(private projectService: ProjectService, private utils: UtilsService, private fileService: FileService) {}

  async getOne(data: { id?: number; phone?: string }, config: types['getOneConfig'] = {}) {
    const findData = await this.utils.queryDB(
      `--sql
          SELECT    u.id
                  , u.name
                  , u.phone
                  , u.timezone
                  , u.config
                  , array(
                    ${sql.selectProjectToUserLink(
                      { userId: ':id' }, // если поставить "u.id", то почему то в выборку попадают лишние проекты
                      { addProjectData: true, showLinkConfig: true },
                    )}
                  ) AS "projectList"
                  , (
                    ${sql.selectIcon('user', 'u')}
                  ) AS "iconFileId"
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
                                        , (${sql.selectIcon('project_to_user', 'p2u')}) AS "userIconFileId"
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
        replacements: { id: data.id || null, phone: data.phone || null },
      },
    );
    return findData[0] || null;
  }

  async search(data: userSearchQueryDTO = { query: '', limit: 50, offset: 0 }) {
    const customWhere = ['', 'u."deleteTime" IS NULL'];
    if (!data.globalSearch) customWhere.push('u2u.id IS NOT NULL');

    const findData = await this.utils.queryDB(
      `--sql
        SELECT    u.id
                , u.phone
                , u.name
                , ( ${sql.selectIcon('user', 'u')} ) AS "iconFileId"
        FROM      "user" u
                  LEFT JOIN "user_to_user" u2u ON u2u."userId" = :userId
                                              AND u2u."contactId" = u.id
        WHERE     u.id != :userId 
              AND ( u.phone LIKE :query OR LOWER(u.name) LIKE LOWER(:query)) 
              ${customWhere.join(' AND ')}
        ORDER BY  u."id"
                  DESC
        LIMIT     :limit
        OFFSET    :offset
    `,
      {
        replacements: {
          query: `%${(data.query || '').trim()}%`,
          userId: data.userId,
          limit: data.limit + 1,
          offset: data.offset,
        },
      },
    );

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

  async create(userData: userAuthQueryDataDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      const createData = await this.utils.queryDB(
        `INSERT INTO "user" ("phone", "addTime", "updateTime") VALUES (:phone, NOW(), NOW()) RETURNING id`,
        {
          type: QueryTypes.INSERT,
          replacements: { phone: userData.phone },
          transaction,
        },
      );
      const user = createData[0][0];
      await this.update(user.id, userData, transaction);
      return user;
    });
  }

  async registrate(userData: userAuthQueryDataDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      const user = await this.create(userData, transaction);
      if (!user.config) user.config = {};
      const personalProject = await this.projectService.create(
        { title: `${user.id}th user's personal project`, userList: [{ userId: user.id, role: 'owner' }] },
        { personalProject: true },
        transaction,
      );
      const workProject = await this.projectService.create(
        { title: `${user.id}th user's work project`, userList: [{ userId: user.id, role: 'owner' }] },
        {},
        transaction,
      );
      await this.update(
        user.id,
        {
          config: { personalProjectId: personalProject.id, currentProjectId: personalProject.id },
        },
        transaction,
      );

      user.config.personalProjectId = personalProject.id;
      return user;
    });
  }

  async update(userId: number, updateData: userUpdateQueryDataDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      if (updateData.phone) delete updateData.phone; // менять номер телефона запрещено
      await this.utils.updateDB({
        table: 'user',
        id: userId,
        data: updateData,
        jsonKeys: ['config'],
        handlers: {
          iconFile: async (value: any) => {
            await this.fileService.create(
              Object.assign(value, { parentType: 'user', parentId: userId, fileType: 'icon' }),
              transaction,
            );
            return { preventDefault: true };
          },
        },
        transaction,
      });
    });
  }

  async checkExists(id: number) {
    const findData = await this.utils.queryDB(
      `--sql
        SELECT id FROM "user" WHERE id = :id AND "deleteTime" IS NULL LIMIT 1
        `,
      { replacements: { id } },
    );
    return findData[0][0] ? true : false;
  }

  async getForeignPersonalProjectList(userId: number) {
    const findData = await this.utils.queryDB(sql.foreignPersonalProjectList(), {
      replacements: { userId },
      type: QueryTypes.SELECT,
    });
    return findData;
  }
  async checkMutualPersonalLinksExists(ownUserId: number, relUserId: number) {
    const findData = await this.utils.queryDB(
      `--sql
        SELECT    p2u_member."id"
        FROM      "project_to_user" AS p2u_member
                , "project_to_user" AS p2u_owner
        WHERE     p2u_member."projectId" = p2u_owner."projectId"
              AND p2u_owner."personal" = true
              AND p2u_owner."userId" = :ownUserId
              AND p2u_owner."role" = 'owner'
              AND p2u_owner."deleteTime" IS NULL
              AND p2u_member."userId" = :relUserId
              AND p2u_member."role" = 'member'
              AND p2u_member."deleteTime" IS NULL
      `,
      { replacements: { ownUserId, relUserId }, type: QueryTypes.SELECT },
    );
    return findData[0] ? true : false;
  }

  async checkFreeTime(userId: number, startTime: string, endTime: string) {
    const findData = await this.utils.queryDB(
      `--sql
        SELECT    *
        FROM      "task_to_user" AS t2u
                  LEFT JOIN "task" AS t ON t.id = t2u."taskId" AND t2u."deleteTime" IS NULL
        WHERE     t2u."userId" = :userId
              AND t."deleteTime" IS NULL
              AND t."startTime" IS NOT NULL
              AND t."endTime" IS NOT NULL
              AND NOT (t."startTime" > :endTime OR t."endTime" < :startTime)
      `,
      { replacements: { userId, startTime, endTime }, type: QueryTypes.SELECT },
    );
    return findData[0] ? false : true;
  }
}
