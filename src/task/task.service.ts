import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, dto, models, types } from '../globalImport';

@nestjs.Injectable()
export class TaskService {
  constructor(
    private sequelize: Sequelize,
    @sequelize.InjectModel(models.task) private taskModel: typeof models.task,
    @sequelize.InjectModel(models.user) private modelUser: typeof models.user,
  ) {}

  async create(data: {
    task: types['models']['task'];
    userId: number;
    projectId: number;
  }): Promise<types['models']['task']> {
    const task = await this.taskModel.create({
      ...data.task,
      project_id: data.projectId,
    });
    return task;
  }

  async getOne(id: number): Promise<types['models']['task']> {
    const findData = await this.taskModel.findOne({
      where: {
        id,
      },
      include: { all: true, nested: true },
    });
    return findData;
  }
}
