import {
  Column,
  Model,
  Table,
  DataType,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  Comment,
} from 'sequelize-typescript';

import { User } from './user';
import { Task } from './task';

@Table({ tableName: 'task_to_user' })
export class TaskToUser extends Model {

  @ForeignKey(() => User)
  @Column
  user_id: number;
  @BelongsTo(() => User)
  user: User;


  @ForeignKey(() => Task)
  @Column
  task_id: number;
  @BelongsTo(() => Task)
  task: Task;

  @Comment('роль пользователя в задаче')
  @Column
  role: string

  @Comment('статус задачи у пользователя')
  @Column
  status: string

  @CreatedAt
  add_time: Date;
  @UpdatedAt
  update_time: Date;
  @DeletedAt
  delete_time: Date;
}
