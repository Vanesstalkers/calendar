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
import { Task } from './task';
import { TaskToUser } from './task_to_user';
import { UserToUser } from './user_to_user';

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

  @HasMany(() => ProjectToUser, 'user_id')
  __project: ProjectToUser[];

  @HasMany(() => Task, 'exec_user')
  __task: Task[];

  @HasMany(() => TaskToUser, 'exec_user')
  __tasktouser: TaskToUser[];

  @HasMany(() => UserToUser, 'user_id')
  __usertouser: UserToUser[];

  @HasMany(() => UserToUser, 'user_rel_id')
  __relusertouser: UserToUser[];

  @CreatedAt
  add_time: Date;
  @UpdatedAt
  update_time: Date;
  @DeletedAt
  delete_time: Date;
}
