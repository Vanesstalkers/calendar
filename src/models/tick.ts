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
  AutoIncrement,
} from 'sequelize-typescript';

import { Task } from './task';

@Table({ tableName: 'tick' })
export class Tick extends Model {

  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Task)
  @Column
  task_id: number;
  @BelongsTo(() => Task)
  task: Task;

  @Comment('описание пункта')
  @Column
  text: string

  @Comment('статус выполнения')
  @Column({ defaultValue: true })
  status: boolean;

  @CreatedAt
  add_time: Date;
  @UpdatedAt
  update_time: Date;
  @DeletedAt
  delete_time: Date;
}
