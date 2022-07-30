import {
  Column,
  Model,
  Table,
  DataType,
  PrimaryKey,
  AutoIncrement,
  HasMany,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
} from 'sequelize-typescript';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ProjectToUser } from './project_to_user';
import { Task } from './task';

@Table({ tableName: 'project' })
export class Project extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  title: string;

  @Column({ type: DataType.JSON, defaultValue: {} })
  config: object;

  @ApiProperty({ type: ()=>[ProjectToUser] })
  @HasMany(() => ProjectToUser, 'project_id')
  __user: ProjectToUser[];

  @ApiProperty({ type: ()=>[Task] })
  @HasMany(() => Task, 'project_id')
  __task: Task[];


  @CreatedAt
  add_time: Date;
  @UpdatedAt
  update_time: Date;
  @DeletedAt
  delete_time: Date;
}