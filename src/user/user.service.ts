import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';

import { User } from '../models/user';
import { Project } from '../models/project';
import { ProjectToUser } from '../models/project_to_user';

@Injectable()
export class UserService {
  constructor(
    private sequelize: Sequelize,
    @InjectModel(User) private modelUser: typeof User,
    @InjectModel(Project) private projectModel: typeof Project,
    @InjectModel(ProjectToUser)
    private modelProjectToUser: typeof ProjectToUser,
  ) {}

  async getOne(where: { id?: number; phone?: string }): Promise<User> {
    const findData = await this.modelUser.findOne({
      where: {
        id: where.id,
        phone: where.phone,
      },
      include: {
        model: ProjectToUser,
        attributes: ['projectId'],
        include: [
          {
            model: Project,
            attributes: ['title'],
          },
        ],
      },
    });
    return findData;
  }

  async create(data: User): Promise<{ user: User; project: Project }> {
    var project, user;

    const t = await this.sequelize.transaction();
    try {
      project = await this.projectModel.create(
        { title: data.name + '`s personal project' },
        { transaction: t },
      );
      user = await this.modelUser.create(
        {
          name: data.name,
          phone: data.phone,
          config: {
            currentProject: {
              id: project.id,
              title: project.title,
            },
          },
        },
        { transaction: t },
      );
      await t.commit();
    } catch (err) {
      await t.rollback();
    }
    await this.modelProjectToUser.create({
      projectId: project.id,
      userId: user.id,
      role: 'owner',
    });

    return { user, project };
  }
}
