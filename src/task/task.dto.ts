import * as swagger from '@nestjs/swagger';

import { projectUserLinkDTO, projectToUserGetOneDTO, projectToUserConfigFiltersDTO } from '../project/project.dto';
import { fileListItemDTO } from '../file/file.dto';
import { commentListItemDTO } from '../comment/comment.dto';

export class taskUserLinkDTO {
  @swagger.ApiProperty({ description: 'ID пользователя' })
  userId?: number;
  @swagger.ApiPropertyOptional({
    description: 'Роль в задаче',
    type: 'string',
    example: '',
    enum: ['', 'exec', 'control'],
  })
  role?: string;
  @swagger.ApiPropertyOptional({
    description: 'Статус задачи (для пользователя)',
    type: 'string',
    example: '',
    enum: [null, 'exec_ready', 'control_ready'],
  })
  status?: string;
  deleteTime?: Date;
}
export class taskUserLinkFullDTO extends taskUserLinkDTO {
  @swagger.ApiProperty({ description: 'ID связи' })
  id?: number;
  @swagger.ApiPropertyOptional({ description: 'Имя пользователя в проекте', type: 'string | null', example: 'Коля' })
  userName?: string;
  @swagger.ApiPropertyOptional({
    description: 'ID файла-иконки пользователя в проекте',
    type: 'number | null',
    example: 0,
  })
  userIconFileId?: number;
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

class userRegularDTO {
  @swagger.ApiProperty({ description: 'Признак регулярности', type: 'boolean | null', example: 'false' })
  enabled: boolean;
  @swagger.ApiProperty({
    description: 'Правило повторения',
    example: 'weekdays',
    enum: ['day', 'week', 'month', 'weekdays'],
  })
  rule: string;
  @swagger.ApiPropertyOptional({
    description: 'Дни недели (только для rule="weekdays")',
    example: [1, 2],
    type: ['number'],
  })
  weekdaysList: [number];
  origTaskId?: number;
}

export class taskDTO {
  @swagger.ApiPropertyOptional({ description: 'Заголовок задачи', type: 'string' })
  title?: string;
  @swagger.ApiPropertyOptional({ description: 'Описание задачи', type: 'string' })
  info?: string;
  @swagger.ApiPropertyOptional({ description: 'Группа задачи', type: 'number | null', example: 0 })
  groupId?: number;
  @swagger.ApiPropertyOptional({
    description: 'Время начала',
    type: 'date | null',
    example: '2022-07-08T19:00:00.000Z',
  })
  startTime?: string;
  @swagger.ApiPropertyOptional({
    description: 'Время окончания',
    type: 'date | null',
    example: '2022-07-08T20:00:00.000Z',
  })
  endTime?: string;
  @swagger.ApiPropertyOptional({ description: 'Формат учета времени', example: 'later', enum: ['', 'later'] })
  timeType?: string;
  @swagger.ApiPropertyOptional({ description: 'Регулярная задача', type: userRegularDTO })
  regular?: userRegularDTO;
  @swagger.ApiProperty({ description: 'Список исполнителей', type: [taskUserLinkDTO] })
  userList?: taskUserLinkDTO[];
  @swagger.ApiPropertyOptional({ description: 'Хэштеги', type: [taskHashtagDTO] })
  hashtagList?: taskHashtagDTO[];
}

export class taskFullDTO extends taskDTO {
  @swagger.ApiPropertyOptional({
    description: 'Внешний источник задачи',
    type: 'string | null',
    example: 'Google Calendar',
  })
  extSource?: string;
  @swagger.ApiPropertyOptional({
    description: 'Внешний получатель задачи',
    type: 'string | null',
    example: 'Telegram: 9266541231',
  })
  extDestination?: string;
  @swagger.ApiPropertyOptional({
    description: 'Когда фактически выполнена',
    type: 'date | null',
    example: '2022-07-08T20:00:00.000Z',
  })
  execEndTime?: string;
  @swagger.ApiPropertyOptional({ description: 'фактический исполнитель', type: 'number | null', example: 0 })
  execUserId?: number;
  @swagger.ApiPropertyOptional({ description: 'Чек-лист', type: [taskTickDTO] })
  tickList?: taskTickDTO[];
  projectId?: number;
  ownUserId?: number;
  ownUser?: projectUserLinkDTO;
  deleteTime?: Date;
}

export class taskUpdateDTO extends taskFullDTO {
  @swagger.ApiPropertyOptional({ description: 'Чек-лист', type: [taskUpdateQueryDataTickDTO] })
  tickList?: taskUpdateQueryDataTickDTO[];
  @swagger.ApiPropertyOptional({ description: 'Хэштеги', type: [taskUpdateQueryDataHashtagDTO] })
  hashtagList?: taskUpdateQueryDataHashtagDTO[];
  deleteTime?: Date;
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

export class taskExecuteQueryDTO {
  @swagger.ApiProperty({ description: 'ID Задачи', example: 0 })
  taskId: number;
}

export class taskUpdateUserStatusQueryDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  taskId: number;
  @swagger.ApiPropertyOptional({ description: 'ID пользователя' })
  userId: number;
  @swagger.ApiProperty({
    description: 'Статус задачи (для пользователя)',
    type: 'string',
    example: 'exec_ready',
    enum: [null, 'exec_ready', 'control_ready'],
  })
  status: string;
}

export class taskDeleteQueryDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  taskId: number;
}

export class taskRestoreQueryDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  taskId: number;
}

export class taskResetUsersDataDTO {
  @swagger.ApiProperty({ description: 'Список исполнителей', type: [taskUserLinkDTO] })
  userList?: taskUserLinkDTO[];
}

export class taskResetUsersQueryDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  taskId: number;
  @swagger.ApiProperty({ type: taskResetUsersDataDTO })
  taskData: taskResetUsersDataDTO;
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
  @swagger.ApiProperty({ description: 'Автор задачи', type: () => projectToUserGetOneDTO })
  ownUser: projectUserLinkDTO;
  @swagger.ApiProperty({ description: 'Список исполнителей', type: [taskUserLinkFullDTO] })
  userList?: taskUserLinkFullDTO[];
  @swagger.ApiProperty({ description: 'Файлы задачи', type: [fileListItemDTO] })
  fileList: fileListItemDTO[];
  @swagger.ApiProperty({ description: 'Чек-лист', type: [taskGetOneQueryDataTickDTO] })
  tickList: taskGetOneQueryDataTickDTO[];
  @swagger.ApiProperty({ description: 'Хэштеги', type: [taskGetOneQueryDataHashtagDTO] })
  hashtagList: taskGetOneQueryDataHashtagDTO[];
  @swagger.ApiProperty({ description: 'Комментарии', type: [commentListItemDTO] })
  commentList: commentListItemDTO[];
}

export class taskSearchQueryDTO {
  userId?: number;
  projectId?: number;
  @swagger.ApiProperty({ description: 'Строка запроса', example: 'купить | #хэштег' })
  query: string;
  @swagger.ApiProperty({ description: 'Лимит на количество результатов в ответе', example: 50 })
  limit?: number;
  @swagger.ApiProperty({ description: 'Сдвиг для поиска', example: 0 })
  offset?: number;
}

export class taskGetAllQueryInboxDTO {
  @swagger.ApiProperty({ description: 'Тип фильтра', example: 'new', enum: ['new', 'finished', 'toexec'] })
  filter: string;
  @swagger.ApiProperty({ description: 'Лимит на количество результатов в ответе', example: 50 })
  limit?: number;
  @swagger.ApiProperty({ description: 'Сдвиг для поиска', example: 0 })
  offset?: number;
}
export class taskGetAllQueryScheduleDTO {
  @swagger.ApiProperty({ description: 'Период с', type: 'date | null', example: '2000-07-08' })
  from: Date;
  @swagger.ApiProperty({ description: 'Период по (включительно)', type: 'date | null', example: '2032-07-10' })
  to: Date;
}
export class taskGetAllQueryOverdueDTO {
  @swagger.ApiProperty({ description: 'Лимит на количество результатов в ответе', example: 50 })
  limit?: number;
  @swagger.ApiProperty({ description: 'Сдвиг для поиска', example: 0 })
  offset?: number;
}
export class taskGetAllQueryLaterDTO {
  @swagger.ApiProperty({ description: 'Лимит на количество результатов в ответе', example: 50 })
  limit?: number;
  @swagger.ApiProperty({ description: 'Сдвиг для поиска', example: 0 })
  offset?: number;
}
export class taskGetAllQueryExecutorsDTO {
  @swagger.ApiProperty({ description: 'Лимит на количество результатов в ответе', example: 50 })
  limit?: number;
  @swagger.ApiProperty({ description: 'Сдвиг для поиска', example: 0 })
  offset?: number;
}

class taskGetAllQueryDataDTO {
  @swagger.ApiProperty({ description: 'Тип фильтра', example: 'new', enum: ['new', 'finished', 'toexec'] })
  filter?: string;
  @swagger.ApiProperty({ description: 'Лимит на количество результатов в ответе', example: 50 })
  limit?: number;
  @swagger.ApiProperty({ description: 'Сдвиг для поиска', example: 0 })
  offset?: number;
  @swagger.ApiProperty({ description: 'Период с', type: 'date | null', example: '2000-07-08' })
  from: Date;
  @swagger.ApiProperty({ description: 'Период по (включительно)', type: 'date | null', example: '2032-07-10' })
  to: Date;
}

export class taskGetAllQueryDTO {
  projectIds?: number[];
  scheduleFilters?: { [key: string]: projectToUserConfigFiltersDTO };
  queryType?: string;
  queryData?: taskGetAllQueryDataDTO;
}
export class taskGetAllQuerySwaggerI {
  constructor() {
    return {
      schema: {
        type: 'object',
        required: ['queryType'],
        properties: {
          queryType: { type: 'number', example: 'inbox', enum: ['inbox', 'schedule', 'overdue', 'later', 'executors'] },
          queryData: {
            type: 'object',
            oneOf: [
              { $ref: swagger.getSchemaPath(taskGetAllQueryInboxDTO) },
              { $ref: swagger.getSchemaPath(taskGetAllQueryScheduleDTO) },
              { $ref: swagger.getSchemaPath(taskGetAllQueryOverdueDTO) },
              { $ref: swagger.getSchemaPath(taskGetAllQueryLaterDTO) },
              { $ref: swagger.getSchemaPath(taskGetAllQueryExecutorsDTO) },
            ],
          },
        },
      },
    };
  }
}

export class taskSearchAnswerDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  id: number;
  @swagger.ApiProperty({ description: 'Название задачи', example: 'Купить помидоры' })
  title: string;
}

class taskGetAllAnswerInboxDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  id: number;
  @swagger.ApiProperty({ description: 'Название задачи', example: 'Купить помидоры' })
  title: string;
}
class taskGetAllAnswerScheludeDTO {
  @swagger.ApiPropertyOptional({ description: 'ID задачи' })
  id?: number;
  @swagger.ApiPropertyOptional({ description: 'ID исходной задачи (для регулярных задач)' })
  origTaskId?: number;
  @swagger.ApiProperty({ description: 'Название задачи', example: 'Купить помидоры' })
  title: string;
  @swagger.ApiPropertyOptional({ description: 'Регулярная задача', type: userRegularDTO })
  regular: userRegularDTO;
  @swagger.ApiProperty({ description: 'Время начала', type: 'date | null', example: '2022-07-08T19:00:00.000Z' })
  startTime: Date;
}
class taskGetAllAnswerOverdueDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  id: number;
  @swagger.ApiProperty({ description: 'Название задачи', example: 'Купить персики' })
  title: string;
}
class taskGetAllAnswerLaterDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  id: number;
  @swagger.ApiProperty({ description: 'Название задачи', example: 'Купить мангал' })
  title: string;
}
class taskGetAllAnswerExecutorsDTO {
  @swagger.ApiProperty({ description: 'ID задачи' })
  id: number;
  @swagger.ApiProperty({ description: 'Название задачи', example: 'Купить билет в кино' })
  title: string;
  @swagger.ApiProperty({ description: 'ID пользователя-исполнителя' })
  execUserId: number;
}

class taskGetAllAnswerWithDataDTO {
  @swagger.ApiProperty({ type: [taskGetOneAnswerDTO] })
  data?: [taskGetOneAnswerDTO];
  @swagger.ApiProperty({
    description: 'Признак отсутствия слещующих элементов для поиска',
    type: 'boolean',
    example: false,
  })
  endOfList?: boolean;
}

export class taskGetAllAnswerDTO {
  @swagger.ApiPropertyOptional({ type: taskGetAllAnswerWithDataDTO })
  inbox?: taskGetAllAnswerWithDataDTO;
  @swagger.ApiPropertyOptional({ type: taskGetAllAnswerWithDataDTO })
  schedule?: taskGetAllAnswerWithDataDTO;
  @swagger.ApiPropertyOptional({ type: taskGetAllAnswerWithDataDTO })
  overdue?: taskGetAllAnswerWithDataDTO;
  @swagger.ApiPropertyOptional({ type: taskGetAllAnswerWithDataDTO })
  later?: taskGetAllAnswerWithDataDTO;
  @swagger.ApiPropertyOptional({ type: taskGetAllAnswerWithDataDTO })
  executors?: taskGetAllAnswerWithDataDTO;
}
