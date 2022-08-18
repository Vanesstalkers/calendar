import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { models, types } from '../globalImport';

import { fileListItemDTO } from '../file/file.dto';
import { commentListItemDTO } from '../comment/comment.dto';

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

  @sequelize.Column({ defaultValue: false })
  require: boolean;

  @sequelize.Column({ allowNull: true })
  execEndTime: Date;

  @sequelize.ForeignKey(() => models.user)
  @sequelize.Column
  execUser: number;
  @sequelize.BelongsTo(() => models.user)
  user: types['models']['user'];

  @sequelize.Column
  title: string;

  @sequelize.Column(sequelize.DataType.TEXT)
  info: string;

  @sequelize.Column
  date: Date;

  @sequelize.Column
  startTime: Date;

  @sequelize.Column({ allowNull: true })
  endTime: Date;

  @sequelize.Column
  timeType: string;

  @sequelize.Column({ defaultValue: false })
  regular: boolean;

  @sequelize.Column
  extSource: string;

  @sequelize.Column
  extDestination: string;

  @sequelize.ForeignKey(() => models.taskgroup)
  @sequelize.Column
  groupId: number;
  @sequelize.BelongsTo(() => models.taskgroup)
  group: types['models']['taskgroup'];

  @sequelize.HasMany(() => models.hashtag, 'taskId')
  hashtagList: types['models']['hashtag'][];

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

  @sequelize.Column
  role: string;

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

@sequelize.Table({ tableName: 'tick' })
export class Tick extends sequelize.Model {
  @sequelize.PrimaryKey
  @sequelize.AutoIncrement
  @sequelize.Column
  id: number;

  @sequelize.ForeignKey(() => models.task)
  @sequelize.Column
  taskId: number;
  @sequelize.BelongsTo(() => models.task)
  task: types['models']['task'];

  @swagger.ApiProperty({ type: 'string', description: 'Описание пункта' })
  @sequelize.Column
  text: string;

  @swagger.ApiPropertyOptional({
    type: 'string',
    example: 'ready',
    enum: ['', 'ready'],
    description: 'Статус выполнения',
  })
  @sequelize.Column({ defaultValue: '' })
  status: string;

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

  @sequelize.Column
  name: string;

  @sequelize.CreatedAt
  addTime: Date;
  @sequelize.UpdatedAt
  updateTime: Date;
  @sequelize.DeletedAt
  deleteTime: Date;
}

export class taskUserLinkDTO {
  @swagger.ApiProperty({ description: 'ID пользователя' })
  userId: number;
  @swagger.ApiPropertyOptional({ description: 'Роль в задаче', type: 'string', example: '', enum: ['', 'exec'] })
  role?: string;
  @swagger.ApiPropertyOptional({
    description: 'Статус задачи (для пользователя)',
    type: 'string',
    example: '',
    enum: ['wait_for_confirm', 'confirm'],
  })
  status?: string;
  deleteTime?: Date;
}

export class taskTickDTO {
  @swagger.ApiProperty({ description: 'Описание пункта', type: 'string' })
  text?: string;
  @swagger.ApiPropertyOptional({
    description: 'Статус выполнения',
    type: 'string | null',
    example: 'ready',
    enum: ['', 'ready'],
  })
  status?: string;
  deleteTime?: Date;
}
class taskUpdateQueryDataTickDTO extends taskTickDTO {
  @swagger.ApiPropertyOptional({ description: 'ID пункта чек-листа' })
  tickId?: number;
}
class taskGetOneQueryDataTickDTO extends taskTickDTO {
  @swagger.ApiProperty({ description: 'ID пункта чек-листа' })
  tickId?: number;
}

export class taskHashtagDTO {
  @swagger.ApiProperty({ description: 'Хэштег', type: 'string', example: 'family' })
  name?: string;
  deleteTime?: Date;
}
class taskUpdateQueryDataHashtagDTO extends taskHashtagDTO {
  // @swagger.ApiPropertyOptional({ description: 'ID хэштега', type: 'number | null', example: 0 })
  // hashtagId?: number;
}
class taskGetOneQueryDataHashtagDTO extends taskHashtagDTO {
  @swagger.ApiProperty({ description: 'ID хэштега' })
  hashtagId?: number;
}

export class taskDTO {
  @swagger.ApiProperty({ description: 'Заголовок задачи', type: 'string' })
  title: string;
  @swagger.ApiProperty({ description: 'Описание задачи', type: 'string' })
  info: string;
  @swagger.ApiPropertyOptional({ description: 'Группа задачи', type: 'number | null', example: 0 })
  groupId: number;
  @swagger.ApiPropertyOptional({
    description: 'Время начала',
    type: 'date | null',
    example: '2022-07-08T19:00:00.000Z',
  })
  startTime: Date;
  @swagger.ApiPropertyOptional({
    description: 'Время окончания',
    type: 'date | null',
    example: '2022-07-08T20:00:00.000Z',
  })
  endTime: Date;
  @swagger.ApiPropertyOptional({ type: 'string', description: 'Формат учета времени' })
  timeType: string;
  @swagger.ApiPropertyOptional({ description: 'Обязательность выполнения', type: 'boolean | null', example: false })
  require: boolean;
  @swagger.ApiPropertyOptional({ description: 'Регулярная задача', type: 'boolean | null', example: false })
  regular: boolean;
  @swagger.ApiProperty({ description: 'Список исполнителей', type: [taskUserLinkDTO] })
  userList: taskUserLinkDTO[];
  @swagger.ApiProperty({ description: 'Хэштеги', type: [taskHashtagDTO] })
  hashtagList: taskHashtagDTO[];
}

export class taskFullDTO extends taskDTO {
  @swagger.ApiPropertyOptional({
    description: 'Внешний источник задачи',
    type: 'string | null',
    example: 'Google Calendar',
  })
  extSource: string;
  @swagger.ApiPropertyOptional({
    description: 'Внешний получатель задачи',
    type: 'string | null',
    example: 'Telegram: 9266541231',
  })
  extDestination: string;
  @swagger.ApiPropertyOptional({
    description: 'Когда фактически выполнена',
    type: 'date | null',
    example: '2022-07-08T20:00:00.000Z',
  })
  execEndTime: Date;
  @swagger.ApiPropertyOptional({ description: 'фактический исполнитель', type: 'number | null', example: 0 })
  execUser: number;
  @swagger.ApiProperty({ description: 'Чек-лист', type: [taskTickDTO] })
  tickList: taskTickDTO[];
  ownUser: number;
}

export class taskUpdateDTO extends taskFullDTO {
  @swagger.ApiProperty({ description: 'Чек-лист', type: [taskUpdateQueryDataTickDTO] })
  tickList: taskUpdateQueryDataTickDTO[];
  @swagger.ApiProperty({ description: 'Хэштеги', type: [taskUpdateQueryDataHashtagDTO] })
  hashtagList: taskUpdateQueryDataHashtagDTO[];
}

export class taskCreateQueryDTO {
  @swagger.ApiProperty({ description: 'ID проекта', example: 0 })
  projectId: number;
  @swagger.ApiProperty({ type: taskFullDTO })
  taskData: taskFullDTO;
}

export class taskUpdateQueryDTO {
  @swagger.ApiProperty({ description: 'ID Задачи', example: 0 })
  taskId: number;
  @swagger.ApiProperty({ type: taskUpdateDTO })
  taskData: taskUpdateDTO;
}

export class taskUpdateUserStatusQueryDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  taskId: number;
  @swagger.ApiProperty({ description: 'ID пользователя' })
  userId: number;
  @swagger.ApiProperty({ description: 'Статус задачи (для пользователя)', example: 'inwork' })
  status: string;
}

export class taskDeleteUserQueryDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  taskId: number;
  @swagger.ApiProperty({ description: 'ID пользователя' })
  userId: number;
}

export class taskDeleteHashtagQueryDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  taskId: number;
  @swagger.ApiProperty({ description: 'Хэштег' })
  name: string;
}

export class taskDeleteTickQueryDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  taskId: number;
  @swagger.ApiProperty({ description: 'ID пункта чек-листа' })
  tickId: number;
}

export class taskGetOneQueryDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  taskId: number;
}

export class taskGetOneAnswerDTO extends taskFullDTO {
  @swagger.ApiProperty({ description: 'ID проекта' })
  projectId: number;
  @swagger.ApiProperty({ description: 'Файлы задачи', type: [fileListItemDTO] })
  fileList: fileListItemDTO[];
  @swagger.ApiProperty({ description: 'Чек-лист', type: [taskGetOneQueryDataTickDTO] })
  tickList: taskGetOneQueryDataTickDTO[];
  @swagger.ApiProperty({ description: 'Хэштеги', type: [taskGetOneQueryDataHashtagDTO] })
  hashtagList: taskGetOneQueryDataHashtagDTO[];
  @swagger.ApiProperty({ description: 'Комментарии', type: [commentListItemDTO] })
  commentList: commentListItemDTO[];
}

export class taskSearchAllQueryDTO {
  projectId?: number;
  @swagger.ApiProperty({ description: 'Строка запроса', example: 'купить | #хэштег' })
  query: string;
  @swagger.ApiProperty({ description: 'Лимит на количество результатов в ответе', example: 50 })
  limit?: number;
}

class taskSearchQueryInboxDTO {
  @swagger.ApiProperty({
    description: 'Тип фильтра',
    example: 'finished',
    enum: ['new', 'regular', 'finished', 'toexec'],
  })
  filter: string;
  @swagger.ApiProperty({ description: 'Лимит на количество результатов в ответе', example: 50 })
  limit?: number;
}
class taskSearchQueryScheduleDTO {
  @swagger.ApiProperty({ description: 'Период с', type: 'date | null', example: '2022-07-08' })
  from: Date;
  @swagger.ApiProperty({ description: 'Период по (включительно)', type: 'date | null', example: '2022-07-10' })
  to: Date;
}
class taskSearchQueryLimitDTO {
  @swagger.ApiProperty({ description: 'Лимит на количество результатов в ответе', example: 50 })
  limit?: number;
}
export class taskSearchQueryDTO {
  projectId?: number;
  @swagger.ApiPropertyOptional({ type: taskSearchQueryInboxDTO })
  inbox?: taskSearchQueryInboxDTO;
  @swagger.ApiPropertyOptional({ type: taskSearchQueryScheduleDTO })
  schedule?: taskSearchQueryScheduleDTO;
  @swagger.ApiPropertyOptional({ type: taskSearchQueryLimitDTO })
  overdue?: taskSearchQueryLimitDTO;
  @swagger.ApiPropertyOptional({ type: taskSearchQueryLimitDTO })
  later?: taskSearchQueryLimitDTO;
}

export class taskSearchAllAnswerDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  id: number;
  @swagger.ApiProperty({ description: 'Название задачи', example: 'Купить помидоры' })
  title: string;
}

class taskSearchAnswerInboxDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  id: number;
  @swagger.ApiProperty({ description: 'Название задачи', example: 'Купить помидоры' })
  title: string;
}
class taskSearchAnswerScheludeDTO {
  @swagger.ApiPropertyOptional({ description: 'ID задачи' })
  id?: number;
  @swagger.ApiPropertyOptional({ description: 'ID исходной задачи (для регулярных задач)' })
  origTaskId?: number;
  @swagger.ApiProperty({ description: 'Название задачи', example: 'Купить помидоры' })
  title: string;
  @swagger.ApiProperty({ description: 'Регулярная задача', type: 'boolean | null', example: false })
  regular: boolean;
  @swagger.ApiProperty({ description: 'Время начала', type: 'date | null', example: '2022-07-08T19:00:00.000Z' })
  startTime: Date;
}
class taskSearchAnswerOverdueDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  id: number;
  @swagger.ApiProperty({ description: 'Название задачи', example: 'Купить персики' })
  title: string;
}
class taskSearchAnswerLaterDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  id: number;
  @swagger.ApiProperty({ description: 'Название задачи', example: 'Купить мангал' })
  title: string;
}

export class taskSearchAnswerDTO {
  @swagger.ApiPropertyOptional({ type: [taskSearchAnswerInboxDTO] })
  inbox?: taskSearchAnswerInboxDTO;
  @swagger.ApiPropertyOptional({ type: [taskSearchAnswerScheludeDTO] })
  schedule?: taskSearchAnswerScheludeDTO;
  @swagger.ApiPropertyOptional({ type: [taskSearchAnswerOverdueDTO] })
  overdue?: taskSearchAnswerOverdueDTO;
  @swagger.ApiPropertyOptional({ type: [taskSearchAnswerLaterDTO] })
  later?: taskSearchAnswerLaterDTO;
}
