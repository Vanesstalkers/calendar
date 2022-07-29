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
    @InjectModel(Task) private modelTask: typeof Task,
    @InjectModel(User) private modelUser: typeof User,
  ) {}

  async getOne(id: number): Promise<Task> {
    const findData = await this.modelTask.findOne({
      where: {
        id,
      },
      //include: {
      //  model: User,
      //  attributes: ['name'],
      //},
      include: { all: true, nested: true },
    });
    return findData;
  }
}
