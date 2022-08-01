import * as nestjs from '@nestjs/common';
import { Op } from 'sequelize';
import * as sequelize from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, dto, models, types, exception } from '../globalImport';

// import { Injectable, ForbiddenException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/sequelize';
// import { Sequelize } from 'sequelize-typescript';

// import { User } from '../models/user';
// import { Project } from '../models/project';
// import { ProjectToUser } from '../models/project_to_user';

@nestjs.Injectable()
export class UserService {
  constructor(
    private sequelize: Sequelize,
    @sequelize.InjectModel(models.user) private userModel: typeof models.user,
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

  async search(query: string): Promise<[types['models']['user']] | []> {
    const findData = await this.sequelize
      .query(
        `
        SELECT u.id, u.name, f.link
        FROM "user" u
        LEFT JOIN "file" f ON f.parent_type = 'user' AND f.parent_id = u.id
        WHERE u.phone LIKE :query OR LOWER(u.name) LIKE LOWER(:query)
        LIMIT 1
      `,
        { replacements: { query: `%${query}%` } },
      )
      .catch(exception.dbErrorCatcher);
    return findData[0];
  }

  async create(data: types['models']['user']): Promise<{
    user: types['models']['user'];
    project: types['models']['project'];
  }> {
    const project = await this.projectModel.create({
      title: data.name + '`s personal project',
    });
    const user = await this.userModel.create({
      name: data.name,
      phone: data.phone,
      config: {
        currentProject: {
          id: project.id,
          title: project.title,
        },
      },
    });
    await this.projectToUserModel.create({
      project_id: project.id,
      user_id: user.id,
      role: 'owner',
    });

    return { user, project };
  }
  async checkExists(id: number): Promise<boolean> {
    const user = await this.getOne({ id }, { checkExists: true }).catch(
      exception.dbErrorCatcher,
    );
    return user ? true : false;
  }
}
