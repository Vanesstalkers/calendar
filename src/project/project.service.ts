import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize/types';
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
    projectData: types['models']['project'],
    transaction?: Transaction,
  ): Promise<types['models']['project']> {
    const createTransaction = !transaction;
    if (createTransaction) transaction = await this.sequelize.transaction();

    const project = await this.projectModel
      .create({}, { transaction })
      .catch(exception.dbErrorCatcher);
    await this.update(project.id, projectData, transaction);

    if (createTransaction) await transaction.commit();
    return project;
  }
  async update(
    projectId: number,
    updateData: types['models']['project'],
    transaction?: Transaction,
  ): Promise<void> {
    await this.utils.updateDB({
      table: 'project',
      id: projectId,
      data: updateData,
      handlers: {
        __projecttouser: async (value: any) => {
          const arr: any[] = Array.from(value);
          for (const link of arr) {
            await this.createLinkToUser(projectId, link.id, link, transaction);
          }
          return { preventDefault: true };
        },
      },
      transaction,
    });
  }

  async getOne(
    data: { id: number; userId?: number },
    config: {
      checkExists?: boolean;
      include?: boolean;
      attributes?: string[];
    } = {},
  ): Promise<any> {
    if (config.checkExists) {
      config.include = false;
      config.attributes = ['id'];
    }

    const whereProjectToUser: { user_id?: number } = {};
    if (data.userId) whereProjectToUser.user_id = data.userId;
    const findData = await this.projectModel
      .findOne({
        where: {
          id: data.id,
        },
        attributes: config.attributes,
        // include: { all: true, nested: true },
        include:
          config.include === false
            ? undefined
            : [
                {
                  attributes: ['role', 'personal', 'user_name', 'user_id'],
                  model: models.project2user,
                  where: whereProjectToUser,
                  include: [
                    {
                      model: models.user,
                      attributes: ['name'],
                    },
                  ],
                  // required: false
                },
                {
                  model: models.task,
                  include: [
                    {
                      attributes: ['role', 'status', 'user_id'],
                      model: models.task2user,
                      include: [
                        {
                          model: models.user,
                          attributes: ['name'],
                        },
                      ],
                      // required: false
                    },
                  ],
                },
              ],
      })
      .catch(exception.dbErrorCatcher);
    return findData || null;
  }

  async checkExists(id: number): Promise<boolean> {
    const project = await this.getOne({ id }, { checkExists: true }).catch(
      exception.dbErrorCatcher,
    );
    return project ? true : false;
  }

  async createLinkToUser(
    project_id: number,
    user_id: number,
    linkData: types['models']['project2user'],
    transaction?: Transaction,
  ): Promise<types['models']['project2user']> {
    const createTransaction = !transaction;
    if (createTransaction) transaction = await this.sequelize.transaction();

    const link = await this.projectToUserModel
      .create({ project_id, user_id }, { transaction })
      .catch(exception.dbErrorCatcher);
    await this.updateLinkToUser(link.id, linkData, transaction);

    if (createTransaction) await transaction.commit();
    return link;
  }
  async updateLinkToUser(
    linkId: number,
    updateData: types['models']['project2user'],
    transaction: Transaction,
  ): Promise<void> {
    await this.utils.updateDB({
      table: 'project_to_user',
      id: linkId,
      data: updateData,
      transaction,
    });
  }
}
