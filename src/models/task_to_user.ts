import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { models, types } from '../globalImport';

@sequelize.Table({ tableName: 'task_to_user' })
export class TaskToUser extends sequelize.Model {

  @sequelize.ForeignKey(() => models.user)
  @sequelize.Column
  user_id: number;
  @sequelize.BelongsTo(() => models.user)
  user: types['models']['user'];


  @sequelize.ForeignKey(() => models.task)
  @sequelize.Column
  task_id: number;
  @sequelize.BelongsTo(() => models.task)
  task: types['models']['task'];

  @sequelize.Comment('роль пользователя в задаче')
  @sequelize.Column
  role: string

  @sequelize.Comment('статус задачи у пользователя')
  @sequelize.Column
  status: string

  @sequelize.CreatedAt
  add_time: Date;
  @sequelize.UpdatedAt
  update_time: Date;
  @sequelize.DeletedAt
  delete_time: Date;
}
