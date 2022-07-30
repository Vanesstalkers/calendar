import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, dto, models, types } from '../globalImport';

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

  async getOne(where: {
    id?: number;
    phone?: string;
  }): Promise<types['models']['user'] | null> {
    const findData = await this.userModel.findOne({
      where: where,
      include: {
        model: models.project2user,
        attributes: ['project_id'],
        include: [
          {
            model: models.project,
            attributes: ['title'],
          },
        ],
      },
    });
    return findData;
  }

  async create(
    data: types['models']['user'],
  ): Promise<{
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
}
