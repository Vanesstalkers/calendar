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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { User } from './user';
import { Project } from './project';

@Table({ tableName: 'project_to_user' })
export class ProjectToUser extends Model {
  @Column({ allowNull: true })
  @ApiProperty({ description: 'роль пользователя в проекте' })
  role: string;

  @ForeignKey(() => User)
  @Column
  user_id: number;
  @ApiProperty({ type: ()=>User })
  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Project)
  @Column
  project_id: number;
  @BelongsTo(() => Project)
  project: Project;

  @Comment('личный проект')
  @Column({ defaultValue: false })
  personal: boolean;

  @Comment('имя пользователя в проекте')
  @Column
  user_name: string

  @Comment('персональные настройки видимости')
  @Column({ type: DataType.JSON, defaultValue: {} })
  config: object;

  @CreatedAt
  add_time: Date;
  @UpdatedAt
  update_time: Date;
  @DeletedAt
  delete_time: Date;
}
