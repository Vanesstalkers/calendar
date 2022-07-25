import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';

import { Project } from '../models/project';
import { User } from '../models/user';
import { ProjectToUser } from '../models/project_to_user';

@Injectable()
export class ProjectService {
  constructor(
    private sequelize: Sequelize,
    @InjectModel(Project) private modelProject: typeof Project,
    @InjectModel(User) private modelUser: typeof User,
    @InjectModel(ProjectToUser)
    private modelProjectToUser: typeof ProjectToUser,
  ) {}

  async getOne(id: number): Promise<Project> {
    const findData = await this.modelProject.findOne({
      where: {
        id,
      },
      include: {
        model: ProjectToUser,
        attributes: ['userId'],
        include: [
          {
            model: User,
            attributes: ['name'],
          },
        ],
      },
    });
    return findData;
  }
}
