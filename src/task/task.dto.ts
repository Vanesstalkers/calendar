import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { models, types } from '../globalImport';

@sequelize.Table({ tableName: 'task' })
export class Task extends sequelize.Model {
  @sequelize.PrimaryKey
  @sequelize.AutoIncrement
  @sequelize.Column
  id: number;

  @sequelize.ForeignKey(() => models.project)
  @sequelize.Column
  projectId: number;
  @sequelize.BelongsTo(() => models.project)
  project: types['models']['project'];

  @sequelize.Comment('обязательность')
  @sequelize.Column({ defaultValue: true })
  require: boolean;

  @swagger.ApiProperty({
    description: 'Когда фактически выполнена',
    example: '2022-07-08T20:00:00.000Z (new  Date().toISOString())',
  })
  @sequelize.Column({ allowNull: true })
  execEndTime: Date;

  @sequelize.ForeignKey(() => models.user)
  @sequelize.Comment('фактический исполнитель')
  @sequelize.Column
  execUser: number;
  @sequelize.BelongsTo(() => models.user)
  user: types['models']['user'];

  @swagger.ApiProperty({ type: 'string', description: 'Заголовок задачи' })
  @sequelize.Column
  title: string;

  @swagger.ApiProperty({ type: 'string', description: 'Описание задачи' })
  @sequelize.Column(sequelize.DataType.TEXT)
  info: string;

  //@swagger.ApiProperty({ type: 'string', description: 'Дата задачи' })
  @sequelize.Column
  date: Date;

  @swagger.ApiProperty({
    type: 'string',
    description: 'Время начала',
    example: '2022-07-08T19:00:00.000Z (new  Date().toISOString())',
  })
  @sequelize.Column
  startTime: Date;

  @swagger.ApiPropertyOptional({
    type: 'string | null',
    description: 'Время окончания',
    example: '2022-07-08T20:00:00.000Z (new  Date().toISOString())',
  })
  @sequelize.Column({ allowNull: true })
  endTime: Date;

  @swagger.ApiPropertyOptional({ type: 'string', description: 'Формат учета времени' })
  @sequelize.Column
  timeType: string;

  @swagger.ApiPropertyOptional({ type: 'boolean', description: 'Регулярная задача' })
  @sequelize.Column({ defaultValue: false })
  regular: boolean;

  @sequelize.Comment('внешний источник задачи')
  @sequelize.Column
  extSource: string;

  @sequelize.Comment('внешний получатель')
  @sequelize.Column
  extDestination: string;

  @sequelize.ForeignKey(() => models.taskgroup)
  @sequelize.Column
  groupId: number;
  @sequelize.BelongsTo(() => models.taskgroup)
  group: types['models']['taskgroup'];

  @sequelize.HasMany(() => models.hashtag, 'taskId')
  hashtagList: types['models']['hashtag'][];

  @swagger.ApiPropertyOptional({
    type: Array,
    example: '[{"id":1},{"id":2}]',
    description: 'Список исполнителей (без постановщика)',
  })
  @sequelize.HasMany(() => models.task2user, 'taskId')
  userList: types['models']['task2user'][];

  @sequelize.HasMany(() => models.tick, 'taskId')
  tickList: types['models']['tick'][];

  @sequelize.HasMany(() => models.comment, 'taskId')
  commentList: types['models']['comment'][];

  @sequelize.CreatedAt
  addTime: Date;
  @sequelize.UpdatedAt
  updateTime: Date;
  @sequelize.DeletedAt
  deleteTime: Date;
}

@sequelize.Table({ tableName: 'task_to_user' })
export class TaskToUser extends sequelize.Model {
  @sequelize.PrimaryKey
  @sequelize.AutoIncrement
  @sequelize.Column
  id: number;

  @sequelize.ForeignKey(() => models.user)
  @sequelize.Column
  userId: number;
  @sequelize.BelongsTo(() => models.user)
  user: types['models']['user'];

  @sequelize.ForeignKey(() => models.task)
  @sequelize.Column
  taskId: number;
  @sequelize.BelongsTo(() => models.task)
  task: types['models']['task'];

  @sequelize.Comment('роль пользователя в задаче')
  @sequelize.Column
  role: string;

  @sequelize.Comment('статус задачи у пользователя')
  @sequelize.Column
  status: string;

  @sequelize.CreatedAt
  addTime: Date;
  @sequelize.UpdatedAt
  updateTime: Date;
  @sequelize.DeletedAt
  deleteTime: Date;
}

@sequelize.Table({ tableName: 'task_group' })
export class TaskGroup extends sequelize.Model {
  @sequelize.PrimaryKey
  @sequelize.AutoIncrement
  @sequelize.Column
  id: number;

  @sequelize.HasMany(() => models.task, 'groupId')
  taskList: types['models']['task'][];

  @sequelize.Column
  name: string;

  @sequelize.CreatedAt
  addTime: Date;
  @sequelize.UpdatedAt
  updateTime: Date;
  @sequelize.DeletedAt
  deleteTime: Date;
}

@sequelize.Table({ tableName: 'hashtag' })
export class Hashtag extends sequelize.Model {
  @sequelize.PrimaryKey
  @sequelize.AutoIncrement
  @sequelize.Column
  id: number;

  @sequelize.ForeignKey(() => models.task)
  @sequelize.Column
  taskId: number;
  @sequelize.BelongsTo(() => models.task)
  task: types['models']['task'];

  @sequelize.Comment('хэштег')
  @sequelize.Column
  hashtag: string;

  @sequelize.CreatedAt
  addTime: Date;
  @sequelize.UpdatedAt
  updateTime: Date;
  @sequelize.DeletedAt
  deleteTime: Date;
}
