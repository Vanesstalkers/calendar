import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize/types';
import { exception, models, types } from '../globalImport';

import { UtilsService } from '../utils/utils.service';
import { searchDTO } from './user.controller';

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

  async getOne(
    data: {
      id?: number;
      phone?: string;
    },
    config: {
      checkExists?: boolean;
      include?: boolean;
      attributes?: string[];
    } = {},
    transaction?: Transaction,
  ): Promise<types['models']['user'] | null> {
    if (config.checkExists) {
      config.include = false;
      config.attributes = ['id'];
    }

    const where: typeof data = {};
    if (data.id) where.id = data.id;
    if (data.phone) where.phone = data.phone;

    const findData = await this.sequelize
      .query(
        `--sql
                SELECT    u.name,
                          u.phone,
                          u.position,
                          u.timezone,
                          u.config,
                          ARRAY(
                          SELECT    row_to_json(ROW)
                          FROM      (
                                    SELECT    p2u.role,
                                              p2u.project_id,
                                              p2u.personal,
                                              p2u.user_name
                                    FROM      "project_to_user" AS p2u
                                    WHERE     p2u.delete_time IS NULL
                                    AND       p2u.user_id = u.id
                                    ) AS ROW
                          ) projectList,
                          (
                          SELECT    id
                          FROM      "file" AS f
                          WHERE     u.delete_time IS NULL
                          AND       f.parent_id = u.id
                          AND       parent_type = 'user'
                          AND       file_type = 'icon'
                          ORDER BY  f.add_time DESC
                          LIMIT    
                                    1
                          ) icon_file_id
                FROM      "user" AS u
                WHERE     u.id = :id
                AND       u.delete_time IS NULL
                LIMIT    
                          1
        `,
        {
          type: QueryTypes.SELECT,
          replacements: { id: data.id },
          transaction,
        },
      )
      .catch(exception.dbErrorCatcher);

    return findData[0] || null;
  }

  async search(
    data: searchDTO = { query: '', limit: 10 },
  ): Promise<[types['models']['user']] | []> {
    const customWhere = [''];
    if (!data.globalSearch) customWhere.push('u2u.id IS NOT NULL');

    const findData = await this.sequelize
      .query(
        `--sql
                SELECT    u.id,
                          u.name,
                          f.file_name
                FROM      "user" u
                LEFT JOIN "file" f ON f.parent_type = 'user'
                AND       f.parent_id = u.id
                LEFT JOIN "user_to_user" u2u ON u2u.user_id = :user_id
                AND       u2u.user_rel_id = u.id
                WHERE     u.id != :user_id
                AND       (
                          u.phone LIKE :query
                OR        LOWER(u.name) LIKE LOWER(:query)
                          )
                ${customWhere.join(' AND ')}
                LIMIT    
                          :limit
        `,
        {
          replacements: {
            query: `%${(data.query || '').trim()}%`,
            user_id: data.userId,
            limit: data.limit,
          },
        },
      )
      .catch(exception.dbErrorCatcher);
    return findData[0];
  }

  async create(
    userData: types['models']['user'],
    transaction?: Transaction,
  ): Promise<types['models']['user']> {
    const createTransaction = !transaction;
    if (createTransaction) transaction = await this.sequelize.transaction();

    const user = await this.userModel
      .create({}, { transaction })
      .catch(exception.dbErrorCatcher);
    await this.update(user.id, userData, transaction);

    if (createTransaction) await transaction.commit();
    return user;
  }

  async update(
    userId: number,
    updateData: types['models']['user'],
    transaction?: Transaction,
  ): Promise<void> {
    await this.utils.updateDB({
      table: 'user',
      id: userId,
      data: updateData,
      jsonKeys: ['config'],
      transaction,
    });
  }

  async checkExists(id: number): Promise<boolean> {
    const user = await this.getOne({ id }, { checkExists: true }).catch(
      exception.dbErrorCatcher,
    );
    return user ? true : false;
  }

  async addContact(data: { userId: number; contactId: number }) {
    const result = await this.sequelize.transaction(async (transaction) => {
      const link = await this.userToUserModel
        .create(
          {
            user_id: data.userId,
            user_rel_id: data.contactId,
          },
          { transaction },
        )
        .catch(exception.dbErrorCatcher);
      return link;
    });
    return result;
  }
}
