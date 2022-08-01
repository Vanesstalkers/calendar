import * as nestjs from '@nestjs/common';
import * as sequelize from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, dto, models, types, exception } from '../globalImport';

@nestjs.Injectable()
export class TaskService {
  constructor(
    private sequelize: Sequelize,
    @sequelize.InjectModel(models.task) private taskModel: typeof models.task,
    @sequelize.InjectModel(models.user) private modelUser: typeof models.user,
    @sequelize.InjectModel(models.task2user)
    private projectToUserModel: typeof models.task2user,
  ) {}

  async create(data: {
    task: types['models']['task'];
    userId: number;
    projectId: number;
    executors?: any;
  }): Promise<types['models']['task']> {
    const result = await this.sequelize.transaction(async (transaction) => {
      const task = await this.taskModel.create(
        {
          ...data.task,
          project_id: data.projectId,
        },
        { transaction },
      );
      for (const execUserId of data.executors) {
        const role = execUserId === data.userId ? 'owner' : 'exec';
        const status = execUserId === data.userId ? undefined : 'confirm';
        await this.projectToUserModel.create(
          {
            task_id: task.id,
            user_id: execUserId,
            role,
            status,
          },
          { transaction },
        );
      }
      return task;
    });
    return result;
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
