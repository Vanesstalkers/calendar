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

import { Task } from './task';

@Table({ tableName: 'task_group' })
export class TaskGroup extends Model {
  
  @ForeignKey(() => Task)
  @Column
  task_id: number;
  @BelongsTo(() => Task)
  task: Task;

  @Comment('название группы')
  @Column
  name: string

  @CreatedAt
  add_time: Date;
  @UpdatedAt
  update_time: Date;
  @DeletedAt
  delete_time: Date;
}
