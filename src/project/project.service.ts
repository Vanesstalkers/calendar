import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, dto, models, types } from '../globalImport';

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
    project: types['models']['project'];
    userId: number;
  }): Promise<types['models']['project']> {
    const project = await this.projectModel.create({
      title: data.project.title,
    });
    await this.projectToUserModel.create({
      project_id: project.id,
      user_id: data.userId,
      role: 'owner',
    });
    return project;
  }

  async getOne(data: { id: number; userId?: number }): Promise<any> {
    const whereProjectToUser: { user_id?: number } = {};
    if (data.userId) whereProjectToUser.user_id = data.userId;
    const findData = await this.projectModel.findOne({
      where: {
        id: data.id,
      },
      //attributes: ['id'],
      include: { all: true, nested: true },
      // include: [
      //   {
      //     //attributes: ['user_id'],
      //     model: ProjectToUser,
      //     where: whereProjectToUser,
      //     include: [
      //       {
      //         model: User,
      //       },
      //     ],
      //     //required: false
      //   },
      // ],
    });
    return findData;

    // const queryResult = await this.sequelize.query(
    //   `
    //   SELECT * FROM project WHERE id = :id
    // `,
    //   { replacements: { id: data.id } },
    // );
  }
}
