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
  ForeignKey,
  BelongsTo,
  Default,
  Comment as sequelizeComment,
} from 'sequelize-typescript';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { User } from './user';
import { Project } from './project';
import { Timestamp } from 'typeorm';
import { TaskGroup } from './task_group';
import { Hashtag } from './hashtag';
import { TaskToUser } from './task_to_user';
import { Tick } from './tick';
import { Comment } from './comment';

@Table({ tableName: 'task' })
export class Task extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Project)
  @Column
  project_id: number;
  @BelongsTo(() => Project)
  project: Project;

  @sequelizeComment('обязательность')
  @Column({ defaultValue: true })
  require: boolean;
  
  @ApiProperty({ description: 'когда выполнена', example: '07.07.1977' })
  @Column({ allowNull: true })
  exec_end_time: Date;
  
  @ForeignKey(() => User)
  @sequelizeComment('фактический исполнитель')
  @Column
  exec_user: number;
  @BelongsTo(() => User)
  user: User;

  @ApiProperty({ description: 'Заголовок задачи' })
  @Column
  title: string;

  @ApiProperty({ description: 'Описание задачи' })
  @Column(DataType.TEXT)
  info: string;

  @sequelizeComment('дата задачи')
  @Column
  date: Date;

  @sequelizeComment('время начала')
  @Column
  start_time: Date;
  
  @sequelizeComment('время окончания')
  @Column({ allowNull: true })
  end_time: Date;

  @sequelizeComment('формат учета времени')
  @Column
  time_type: string;

  @sequelizeComment('регулярная задача')
  @Column({ defaultValue: true })
  regular: boolean;
  
  @sequelizeComment('внешний источник задачи')
  @Column
  ext_source: string;

  @sequelizeComment('внешний получатель')
  @Column
  ext_destination: string;

  @HasMany(() => TaskGroup, 'task_id')
  __taskgroup: TaskGroup[];

  @HasMany(() => Hashtag, 'task_id')
  __hashtag: TaskGroup[];

  @HasMany(() => TaskToUser, 'task_id')
  __tasktouser: TaskToUser[];

  @HasMany(() => Tick, 'task_id')
  __tick: Tick[];

  @HasMany(() => Comment, 'task_id')
  __comment: Comment[];

  @CreatedAt
  add_time: Date;
  @UpdatedAt
  update_time: Date;
  @DeletedAt
  delete_time: Date;
}
