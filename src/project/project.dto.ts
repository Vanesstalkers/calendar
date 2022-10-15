import * as swagger from '@nestjs/swagger';

import { fileDTO, fileListItemDTO, fileUploadQueryFileDTO } from '../file/file.dto';

export class projectToUserConfigFiltersDTO {
  @swagger.ApiProperty({
    description: 'Показывать все задачи из этого проекта (true) или только задачи встречи (false)',
    type: 'boolean',
    example: true,
  })
  showAllTasks: boolean;
  @swagger.ApiProperty({
    description: 'Показывать содержимое задач (true) или нет (false)',
    type: 'boolean',
    example: true,
  })
  showTaskContent: boolean;
}
class projectToUserConfigDTO {
  @swagger.ApiPropertyOptional({ type: { '[ID проекта]': { type: projectToUserConfigFiltersDTO } } })
  scheduleFilters?: { [key: string]: projectToUserConfigFiltersDTO };
  userIconFileId?: number;
}

export class projectToUserUpdateDTO {
  @swagger.ApiProperty({ description: 'ID пользователя', type: 'number', example: 0 })
  userId?: number;
  @swagger.ApiProperty({ description: 'Системная роль', type: 'string', enum: ['owner', 'member'], example: 'owner' })
  role?: string;
  @swagger.ApiPropertyOptional({ description: 'Имя пользователя в проекте', type: 'string | null', example: 'Коля' })
  userName?: string;
  @swagger.ApiPropertyOptional({
    description: 'Описание роли (должности) в проекте',
    type: 'string | null',
    example: 'Разработчик в Wazzup',
  })
  position?: string;
  @swagger.ApiPropertyOptional({
    description: 'Конфиг сущности-связи project_to_user',
    type: () => projectToUserConfigDTO,
  })
  config?: projectToUserConfigDTO;
  deleteTime?: Date;
  userIconFile?: fileDTO;
}

export class projectConfigDTO {
  iconFileId?: number;
}

export class projectUpdateQueryDataDTO {
  @swagger.ApiPropertyOptional({ description: 'Название проекта', type: 'string | null', example: 'Проект №1' })
  title?: string;
  personal?: boolean;
  @swagger.ApiPropertyOptional({ description: 'Конфиг проекта', type: projectConfigDTO })
  config?: projectConfigDTO;
  iconFile?: fileDTO;
  @swagger.ApiPropertyOptional({ description: 'Участники проекта', type: [projectToUserUpdateDTO] })
  userList?: projectToUserUpdateDTO[];
}

export class projectCreateQueryDTO extends projectUpdateQueryDataDTO {}

export class projectUpdateQueryDTO {
  @swagger.ApiProperty({ description: 'ID проекта' })
  projectId: number;
  @swagger.ApiProperty({ type: projectUpdateQueryDataDTO, description: 'schema: projectUpdateQueryDataDTO' })
  projectData: projectUpdateQueryDataDTO;
  @swagger.ApiProperty({ type: fileUploadQueryFileDTO })
  iconFile: fileUploadQueryFileDTO;
}

export class projectUpdateWithFormdataQueryDTO {
  @swagger.ApiProperty({ description: 'ID проекта' })
  projectId: number;
  @swagger.ApiProperty({ type: projectUpdateQueryDataDTO, description: 'schema: projectUpdateQueryDataDTO' })
  projectData: projectUpdateQueryDataDTO;
  @swagger.ApiPropertyOptional({ description: 'Файл иконки', type: 'string', format: 'binary' })
  iconFile: fileDTO;
}

export class projectUpdateUserQueryDTO {
  @swagger.ApiProperty({ description: 'ID проекта' })
  projectId: number;
  @swagger.ApiProperty({ description: 'ID пользователя' })
  userId: number;
  @swagger.ApiPropertyOptional({ description: 'Имя пользователя в проекте', type: 'string | null', example: 'Коля' })
  userName: string;
  @swagger.ApiPropertyOptional({
    description: 'Описание роли (должности) в проекте',
    type: 'string | null',
    example: 'Разработчик в Wazzup',
  })
  position?: string;
  @swagger.ApiProperty({ type: fileUploadQueryFileDTO })
  iconFile: fileUploadQueryFileDTO;
}
export class projectUpdateUserWithFormdataQueryDTO {
  @swagger.ApiProperty({ description: 'ID проекта' })
  projectId: string;
  @swagger.ApiProperty({ description: 'ID пользователя' })
  userId: string;
  @swagger.ApiPropertyOptional({ description: 'Имя пользователя в проекте', type: 'string | null', example: 'Коля' })
  userName: string;
  @swagger.ApiPropertyOptional({
    description: 'Описание роли (должности) в проекте',
    type: 'string | null',
    example: 'Разработчик в Wazzup',
  })
  position?: string;
  @swagger.ApiPropertyOptional({ description: 'Файл иконки', type: 'string', format: 'binary' })
  iconFile: fileDTO;
}

export class projectTransferQueryDTO {
  @swagger.ApiProperty({ description: 'ID проекта' })
  projectId: number;
  @swagger.ApiProperty({ description: 'ID пользователя' })
  userId: number;
}

export class projectGetOneQueryDTO {
  @swagger.ApiProperty({ description: 'ID проекта' })
  projectId: number;
}

export class projectUserLinkDTO {
  @swagger.ApiProperty({ description: 'ID сущности-связи project_to_user', type: 'number', example: 0 })
  projectToUserLinkId?: number;
  @swagger.ApiProperty({ description: 'Системная роль', type: 'string', example: 'owner', enum: ['owner', 'member'] })
  role?: string;
  @swagger.ApiPropertyOptional({ description: 'Имя пользователя в проекте', type: 'string | null', example: 'Коля' })
  userName?: string;
  @swagger.ApiPropertyOptional({
    description: 'Описание роли (должности) в проекте',
    type: 'string | null',
    example: 'Разработчик в Wazzup',
  })
  position?: string;
  @swagger.ApiPropertyOptional({ description: 'Признак личного проекта', type: 'boolean | null', example: true })
  personal?: boolean;
  deleteTime?: Date;
  userId?: number;
  id?: number;
}
export class userGetOneAnswerProjectDTO extends projectUserLinkDTO {
  @swagger.ApiProperty({ description: 'ID проекта', type: 'number', example: 0 })
  projectId?: number;
  @swagger.ApiPropertyOptional({ description: 'ID файла-иконки проекта', type: 'number | null', example: 0 })
  projectIconFileId?: number;
  @swagger.ApiPropertyOptional({
    description: 'ID файла-иконки пользователя в проекте',
    type: 'number | null',
    example: 0,
  })
  userIconFileId?: number;
}

export class projectToUserGetOneDTO extends projectUserLinkDTO {
  @swagger.ApiPropertyOptional({ description: 'ID файла-иконки в проекте', type: 'number | null', example: 0 })
  userIconFileId?: number;
  @swagger.ApiProperty({ description: 'Основное имя пользователя', type: 'string', example: 'Николай' })
  baseUserName?: string;
  @swagger.ApiPropertyOptional({ description: 'ID основного файла-иконки', type: 'number | null', example: 0 })
  baseUserIconFileId?: number;
  projectIconFileId?: number;
}

export class projectGetOneAnswerUserDTO extends projectToUserGetOneDTO {
  @swagger.ApiProperty({ description: 'ID пользователя', type: 'number', example: 0 })
  userId?: number;
  @swagger.ApiPropertyOptional({
    description: 'Конфиг сущности-связи project_to_user',
    type: {
      scheduleFilters: {
        type: 'object',
        properties: {
          '[ID проекта]': {
            type: 'object',
            properties: {
              showAllTasks: {
                type: 'boolean',
                description: 'Показывать все задачи из этого проекта (true) или только задачи встречи (false)',
              },
              showTaskContent: { type: 'boolean', description: 'Показывать содержимое задач (true) или нет (false)' },
            },
          },
        },
      },
    },
  })
  config?: projectToUserConfigDTO;
}

export class projectAddUserQueryDTO {
  @swagger.ApiProperty({ description: 'ID проекта' })
  projectId: number;
  @swagger.ApiProperty({ description: 'ID пользователя' })
  userId: number;
  @swagger.ApiPropertyOptional({ description: 'Имя пользователя в проекте', type: 'string | null', example: 'Коля' })
  userName?: string;
  @swagger.ApiPropertyOptional({
    description: 'Описание роли (должности) в проекте',
    type: 'string | null',
    example: 'Разработчик в Wazzup',
  })
  position?: string;
}

export class projectDeleteUserQueryDTO {
  @swagger.ApiProperty({ description: 'ID проекта' })
  projectId: number;
  @swagger.ApiProperty({ description: 'ID пользователя' })
  userId: number;
}

export class projectDeleteUserAnswerDTO {
  @swagger.ApiPropertyOptional({ description: 'ID сменного проекта (когда был удален текущий проект)' })
  redirectProjectId: number;
}

export class projectGetOneAnswerDTO {
  @swagger.ApiProperty({ description: 'Название проекта', type: 'string', example: 'Проект №1' })
  title: string;
  @swagger.ApiPropertyOptional({ description: 'Признак личного проекта', type: 'boolean | null', example: true })
  personal?: boolean;
  @swagger.ApiPropertyOptional({ description: 'ID файла-иконки', type: 'number | null', example: 0 })
  iconFileId?: number;
  @swagger.ApiProperty({ description: 'Участники проекта', type: [projectGetOneAnswerUserDTO] })
  userList: projectGetOneAnswerUserDTO[];
}
