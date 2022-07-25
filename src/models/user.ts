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

@Table({ tableName: 'user' })
export class User extends Model {
  // non-db fields
  preventSendSms: boolean;

  // db fields
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column
  phone: string;

  @Column({ allowNull: true })
  position: string;

  @Column({ allowNull: true })
  timezone: string;

  @Column({ type: DataType.JSON, defaultValue: {} })
  config: {
    currentProject: object;
  };

  @HasMany(() => ProjectToUser, 'userId')
  __project: ProjectToUser[];

  @CreatedAt
  add_time: Date;
  @UpdatedAt
  update_time: Date;
  @DeletedAt
  delete_time: Date;
}
