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

import { ProjectToUser } from './project_to_user';

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

  @HasMany(() => ProjectToUser, 'projectId')
  __user: ProjectToUser[];

  @CreatedAt
  add_time: Date;
  @UpdatedAt
  update_time: Date;
  @DeletedAt
  delete_time: Date;
}
