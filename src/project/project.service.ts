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
    @InjectModel(Project) private projectModel: typeof Project,
    @InjectModel(ProjectToUser)
    private projectToUserModel: typeof ProjectToUser,
  ) {}

  async create(data: { project: Project; userId: number }): Promise<Project> {
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
