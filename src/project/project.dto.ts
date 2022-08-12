import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { models, types } from '../globalImport';

@sequelize.Table({ tableName: 'project' })
export class Project extends sequelize.Model {
  @sequelize.PrimaryKey
  @sequelize.AutoIncrement
  @sequelize.Column
  id: number;

  @sequelize.Column
  title: string;

  @sequelize.Column({ type: sequelize.DataType.JSON, defaultValue: {} })
  config: object;

  @sequelize.HasMany(() => models.project2user, 'projectId')
  userList: types['models']['project2user'][];

  @swagger.ApiProperty({ type: () => [models.task] })
  @sequelize.HasMany(() => models.task, 'projectId')
  taskList: types['models']['task'][];

  @sequelize.CreatedAt
  addTime: Date;
  @sequelize.UpdatedAt
  updateTime: Date;
  @sequelize.DeletedAt
  deleteTime: Date;
}

@sequelize.Table({ tableName: 'project_to_user' })
export class ProjectToUser extends sequelize.Model {
  @sequelize.Column({ allowNull: true })
  role: string;

  @sequelize.ForeignKey(() => models.user)
  @sequelize.Column
  userId: number;
  @swagger.ApiProperty({ type: () => models.user })
  @sequelize.BelongsTo(() => models.user)
  user: types['models']['user'];

  @sequelize.ForeignKey(() => models.project)
  @sequelize.Column
  projectId: number;
  @sequelize.BelongsTo(() => models.project)
  project: types['models']['project'];

  @sequelize.Column({ defaultValue: false })
  personal: boolean;

  @sequelize.Column
  userName: string;

  @sequelize.Column({ type: sequelize.DataType.JSON, defaultValue: {} })
  config: object;

  @sequelize.CreatedAt
  addTime: Date;
  @sequelize.UpdatedAt
  updateTime: Date;
  @sequelize.DeletedAt
  deleteTime: Date;
}

export class projectToUserUpdateDTO {
  @swagger.ApiPropertyOptional({
    type: 'string | null',
    example: 'owner',
    enum: ['owner', 'exec'],
    description: 'Роль в проекте',
  })
  role?: string;
  @swagger.ApiProperty({ description: 'ID пользователя', type: 'number', example: 0 })
  userId?: number;
  @swagger.ApiPropertyOptional({ description: 'Имя пользователя в проекте', type: 'string | null', example: 'Коля' })
  userName?: string;
}
export class projectToUserDTO extends projectToUserUpdateDTO {
  @swagger.ApiPropertyOptional({ description: 'Отметка личного проекта', type: 'boolean | null', example: true })
  personal?: boolean;
}

class projectConfigDTO {}

export class projectUpdateQueryDataDTO {
  @swagger.ApiPropertyOptional({ description: 'Название проекта', type: 'string | null', example: 'Проект №1' })
  title?: string;
  @swagger.ApiPropertyOptional({ description: 'Конфиг проекта', type: projectConfigDTO })
  config?: object;
  @swagger.ApiPropertyOptional({ description: 'Участники проекта', type: [projectToUserUpdateDTO] })
  userList?: projectToUserUpdateDTO[];
}

export class projectCreateQueryDTO extends projectUpdateQueryDataDTO {}

export class projectUpdateQueryDTO {
  @swagger.ApiProperty({ description: 'ID проекта' })
  projectId: number;
  @swagger.ApiProperty({ type: projectUpdateQueryDataDTO, description: 'schema: projectUpdateQueryDataDTO' })
  projectData: projectUpdateQueryDataDTO;
}

export class projectUpdateUserQueryDTO {
  @swagger.ApiProperty({ description: 'ID проекта' })
  projectId: number;
  @swagger.ApiProperty({ description: 'ID пользователя' })
  userId: number;
  @swagger.ApiPropertyOptional({ description: 'Имя пользователя в проекте', type: 'string | null', example: 'Коля' })
  userName: string;
  @swagger.ApiPropertyOptional({ description: 'Файл иконки', type: 'string', format: 'binary' })
  iconFile: types['models']['file'];
}

class projectGetOneAnswerUserDTO {
  @swagger.ApiProperty({ description: 'ID пользователя', type: 'number', example: 0 })
  userId?: number;
  @swagger.ApiProperty({ description: 'Роль в проекте', type: 'string', example: 'owner', enum: ['owner', 'exec'] })
  role?: string;
  @swagger.ApiPropertyOptional({ description: 'Имя пользователя в проекте', type: 'string | null', example: 'Коля' })
  userName?: string;
  @swagger.ApiPropertyOptional({ description: 'Отметка личного проекта', type: 'boolean | null', example: true })
  personal?: boolean;
  @swagger.ApiPropertyOptional({ description: 'ID файла-иконки в проекте', type: 'number | null', example: 0 })
  userIconFileId?: number;
  @swagger.ApiProperty({ description: 'Основное имя пользователя', type: 'string', example: 'Николай' })
  baseUserName?: string;
  @swagger.ApiPropertyOptional({ description: 'ID основного файла-иконки', type: 'number | null', example: 0 })
  baseUserIconFileId?: number;
}

class projectGetOneAnswerTaskUserDTO {
  @swagger.ApiProperty({ description: 'ID пользователя', type: 'number', example: 0 })
  userId?: number;
}

class projectGetOneAnswerTaskDTO {
  @swagger.ApiProperty({ description: 'ID задачи', type: 'number', example: 0 })
  id?: number;
  @swagger.ApiProperty({ description: 'Исполнители задачи', type: [projectGetOneAnswerTaskUserDTO] })
  userList: projectGetOneAnswerTaskUserDTO[];
  @swagger.ApiProperty({ description: 'Количество комментариев', type: 'number', example: 0 })
  commentCount: number;
}

export class projectGetOneAnswerDTO {
  @swagger.ApiProperty({ description: 'Название проекта', type: 'string', example: 'Проект №1' })
  title: string;
  @swagger.ApiProperty({ description: 'Конфиг проекта', type: projectConfigDTO })
  config: object;
  @swagger.ApiProperty({ description: 'Участники проекта', type: [projectGetOneAnswerUserDTO] })
  userList: projectGetOneAnswerUserDTO[];
  @swagger.ApiProperty({ description: 'Задачи проекта', type: [projectGetOneAnswerTaskDTO] })
  taskList: projectGetOneAnswerTaskDTO[];
}
