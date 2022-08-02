import * as nestjs from '@nestjs/common';
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

@nestjs.Injectable()
export class ProjectService {
  constructor(
    private sequelize: Sequelize,
    @sequelize.InjectModel(models.project)
    private projectModel: typeof models.project,
    @sequelize.InjectModel(models.project2user)
    private projectToUserModel: typeof models.project2user,
  ) {}

  async create(data: {
    project: { title: string };
    project_link?: {personal: boolean},
    userId: number;
  }): Promise<types['models']['project']> {
    const project = await this.projectModel.create({
      title: data.project.title,
    });
    await this.projectToUserModel.create({
      project_id: project.id,
      user_id: data.userId,
      role: 'owner',
      personal: data?.project_link?.personal,
    });
    return project;
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
                  //attributes: ['user_id'],
                  model: models.project2user,
                  where: whereProjectToUser,
                  include: [
                    {
                      model: models.user,
                    },
                  ],
                  // required: false
                },
              ],
      })
      .catch(exception.dbErrorCatcher);
    return findData || null;

    // const queryResult = await this.sequelize.query(
    //   `
    //   SELECT * FROM project WHERE id = :id
    // `,
    //   { replacements: { id: data.id } },
    // );
  }

  async checkExists(id: number): Promise<boolean> {
    const project = await this.getOne({ id }, { checkExists: true }).catch(
      exception.dbErrorCatcher,
    );
    return project ? true : false;
  }
}
