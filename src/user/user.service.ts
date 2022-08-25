import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize/types';
import { exception, models, types, sql } from '../globalImport';

import { UtilsService } from '../utils/utils.service';
import { userAuthQueryDataDTO, userSearchQueryDTO, userUpdateQueryDataDTO } from './user.dto';

@nestjs.Injectable()
export class UserService {
  constructor(
    private sequelize: Sequelize,
    @sequelize.InjectModel(models.user) private userModel: typeof models.user,
    @sequelize.InjectModel(models.user2user)
    private userToUserModel: typeof models.user2user,
    @sequelize.InjectModel(models.project)
    private projectModel: typeof models.project,
    @sequelize.InjectModel(models.project2user)
    private projectToUserModel: typeof models.project2user,
    private utils: UtilsService,
  ) {}

  async getOne(data: { id?: number; phone?: string }, config: types['getOneConfig'] = {}, transaction?: Transaction) {
    if (config.checkExists) {
      config.include = false;
      config.attributes = ['id'];
    }

    const findData = await this.sequelize
      .query(
        `--sql
                SELECT    u.id
                        , u.name
                        , u.phone
                        , u.position
                        , u.timezone
                        , u.config
                        , array( ${sql.project.getUserLink(
                          { userId: ':id' }, // если поставить "u.id", то почему то в выборку попадают лишние проекты
                          { addProjectData: true },
                        )} ) AS "projectList"
                        , ( ${sql.file.getIcon('user', 'u')} ) AS "iconFileId"
                        , array(
                          SELECT    row_to_json(ROW)
                          FROM      (
                                    SELECT    "contactId"
                                            , "priority"
                                    FROM      "user_to_user"
                                    WHERE     "deleteTime" IS NULL AND      
                                              "userId" = u.id
                                    ) AS ROW
                          ) AS "contactList"
                FROM      "user" AS u
                WHERE     (
                          u.id = :id OR       
                          u.phone = :phone
                          ) AND      
                          u."deleteTime" IS NULL
                LIMIT    
                          1
        `,
        {
          type: QueryTypes.SELECT,
          replacements: { id: data.id || null, phone: data.phone || null },
          transaction,
        },
      )
      .catch(exception.dbErrorCatcher);

    return findData[0] || null;
  }

  async search(data: userSearchQueryDTO = { query: '', limit: 50, offset: 0 }) {
    const customWhere = [''];
    if (!data.globalSearch) customWhere.push('u2u.id IS NOT NULL');

    const findData = await this.sequelize
      .query(
        `--sql
                SELECT    u.id
                        , u.phone
                        , u.name
                        , ( ${sql.file.getIcon('user', 'u')} ) AS "iconFileId"
                FROM      "user" u
                LEFT JOIN "user_to_user" u2u ON u2u."userId" = :userId AND      
                          u2u."contactId" = u.id
                WHERE     u.id != :userId AND      
                          (
                          u.phone LIKE :query OR       
                          LOWER(u.name) LIKE LOWER(:query)
                          ) ${customWhere.join(' AND ')}
                ORDER BY u."id" DESC
                LIMIT    
                          :limit
                OFFSET    
                          :offset
        `,
        {
          replacements: {
            query: `%${(data.query || '').trim()}%`,
            userId: data.userId,
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

  async create(userData: userAuthQueryDataDTO, transaction?: Transaction) {
    const createTransaction = !transaction;
    if (createTransaction) transaction = await this.sequelize.transaction();

    const user = await this.userModel
      .create({ phone: userData.phone }, { transaction })
      .catch(exception.dbErrorCatcher);
    await this.update(user.id, userData, transaction);

    if (createTransaction) await transaction.commit();
    return user;
  }

  async update(userId: number, updateData: userUpdateQueryDataDTO, transaction?: Transaction) {
    if (updateData.phone) delete updateData.phone; // менять номер телефона запрещено
    await this.utils.updateDB({
      table: 'user',
      id: userId,
      data: updateData,
      jsonKeys: ['config'],
      transaction,
    });
  }

  async checkExists(id: number) {
    const findData = await this.userModel
      .findOne({ where: { id }, attributes: ['id'] })
      .catch(exception.dbErrorCatcher);
    return findData ? true : false;
  }

  async addContact(data: { userId: number; contactId: number }) {
    const result = await this.sequelize.transaction(async (transaction) => {
      const link = await this.userToUserModel
        .create({ userId: data.userId, contactId: data.contactId }, { transaction })
        .catch(exception.dbErrorCatcher);
      return link;
    });
    return result;
  }
  async getContact(userId: number, contactId: number, config: types['getOneConfig'] = {}) {
    if (config.checkExists) {
      config.attributes = ['id'];
    }
    const findData = await this.sequelize
      .query(
        `--sql
        SELECT ${(config.attributes || ['*']).join(',')} 
        FROM "user_to_user"
        WHERE "userId" = :userId AND "contactId" = :contactId
      `,
        { replacements: { userId, contactId }, type: QueryTypes.SELECT },
      )
      .catch(exception.dbErrorCatcher);
    return findData[0] || null;
  }
  async checkContactExists(userId: number, contactId: number) {
    const contact = await this.getContact(userId, contactId, { checkExists: true }).catch(exception.dbErrorCatcher);
    return contact ? true : false;
  }
}
