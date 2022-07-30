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
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Project) private projectModel: typeof Project,
    @InjectModel(ProjectToUser)
    private projectToUserModel: typeof ProjectToUser,
  ) {}

  async getOne(where: { id?: number; phone?: string }): Promise<User | null> {
    const findData: User | null = await this.userModel.findOne({
      where: where,
      include: {
        model: ProjectToUser,
        attributes: ['project_id'],
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
