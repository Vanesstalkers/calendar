import * as nestjs from '@nestjs/common';
import { Op } from 'sequelize';
import * as sequelize from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import {
  decorators,
  interfaces,
  models,
  types,
  exception,
} from '../globalImport';

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
  ): Promise<types['models']['user'] | null> {
    if (config.checkExists) {
      config.include = false;
      config.attributes = ['id'];
    }

    const where: typeof data = {};
    if (data.id) where.id = data.id;
    if (data.phone) where.phone = data.phone;

    const findData = await this.userModel
      .findOne({
        where,
        attributes: config.attributes,
        include:
          config.include === false
            ? undefined
            : [
                {
                  model: models.project2user,
                  include: [
                    {
                      model: models.project,
                      attributes: ['title'],
                    },
                  ],
                },
              ],
      })
      .catch(exception.dbErrorCatcher);
    return findData;
  }

  async search(
    data: searchDTO = { query: '', limit: 10 },
  ): Promise<[types['models']['user']] | []> {
    const where = [];
    where.push('u.id != :user_id');
    where.push('(u.phone LIKE :query OR LOWER(u.name) LIKE LOWER(:query))');
    if (!data.globalSearch) where.push('u2u.id IS NOT NULL');

    const findData = await this.sequelize
      .query(
        `
        SELECT
          u.id, u.name, f.filename
        FROM
          "user" u
          LEFT JOIN "file" f
          ON f.parent_type = 'user' AND f.parent_id = u.id
          LEFT JOIN user_to_user u2u
          ON u2u.user_id = :user_id AND u2u.user_rel_id = u.id
        WHERE ${where.join(' AND ')}
        LIMIT :limit
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
    data: types['models']['user'],
  ): Promise<types['models']['user']> {
    const user = await this.userModel.create({
      name: data.name,
      phone: data.phone,
    });
    return user;
  }
  async update(userId: number, updateData: any): Promise<boolean> {
    const setList = [],
      replacements = { id: userId };
    for (const [key, value] of Object.entries(updateData)) {
      if (key === 'config') {
        setList.push(`"config" = "config"::jsonb || :config::jsonb`);
        replacements[key] = JSON.stringify(value);
      } else {
        setList.push(`"${key}" = :${key}`);
        replacements[key] = value;
      }
    }
    const queryResult = await this.sequelize
      .query(
        `
      UPDATE "user" SET ${setList.join(',')} WHERE id = :id
    `,
        { replacements },
      )
      .catch(exception.dbErrorCatcher);

    return true;
  }

  async checkExists(id: number): Promise<boolean> {
    const user = await this.getOne({ id }, { checkExists: true }).catch(
      exception.dbErrorCatcher,
    );
    return user ? true : false;
  }

  async addContact(data: { userId: number; relUserId: number }) {
    const result = await this.sequelize.transaction(async (transaction) => {
      const link = await this.userToUserModel.create(
        {
          user_id: data.userId,
          user_rel_id: data.relUserId,
        },
        { transaction },
      );
      return link;
    });
    return result;
  }
}
