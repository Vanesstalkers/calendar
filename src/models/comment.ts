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
  Comment as sequelizeComment,
  AutoIncrement,
} from 'sequelize-typescript';

import { Task } from './task';

@Table({ tableName: 'comment' })
export class Comment extends Model {

  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Task)
  @Column
  task_id: number;
  @BelongsTo(() => Task)
  task: Task;

  @sequelizeComment('текст комментария')
  @Column
  text: string

  @CreatedAt
  add_time: Date;
  @UpdatedAt
  update_time: Date;
  @DeletedAt
  delete_time: Date;
}
