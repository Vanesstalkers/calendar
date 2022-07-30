import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';

import { Task } from '../models/task';
import { Project } from '../models/project';
import { User } from '../models/user';
import { ProjectToUser } from '../models/project_to_user';

@Injectable()
export class TaskService {
  constructor(
    private sequelize: Sequelize,
    @InjectModel(Task) private taskModel: typeof Task,
    @InjectModel(User) private modelUser: typeof User,
  ) {}

  async create(data: { task: Task; userId: number, projectId: number }): Promise<Task> {
    const task = await this.taskModel.create({
      ...data.task,
      project_id: data.projectId
    });
    // await this.projectToUserModel.create({
    //   project_id: project.id,
    //   user_id: data.userId,
    //   role: 'owner',
    // });
    return task;
  }

  async getOne(id: number): Promise<Task> {
    const findData = await this.taskModel.findOne({
      where: {
        id,
      },
      include: { all: true, nested: true },
    });
    return findData;
  }
}
