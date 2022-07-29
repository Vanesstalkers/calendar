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

@Table({ tableName: 'user_to_user' })
export class UserToUser extends Model {

  @ForeignKey(() => User)
  @Column
  user_id: number;
  @BelongsTo(() => User)
  user: User;


  @ForeignKey(() => User)
  @Column
  user_rel_id: number;
  @BelongsTo(() => User)
  reluser: User;

  @Comment('приоритет')
  @Column
  priority: number


  @CreatedAt
  add_time: Date;
  @UpdatedAt
  update_time: Date;
  @DeletedAt
  delete_time: Date;
}
