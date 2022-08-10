import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { interfaces, models, types } from '../globalImport';

@sequelize.Table({ tableName: 'user' })
export class User extends sequelize.Model {
  @sequelize.PrimaryKey
  @sequelize.AutoIncrement
  @sequelize.Column
  id: number;

  // @swagger.ApiPropertyOptional({description: 'Имя пользователя', example: 'Николай'})
  @sequelize.Column
  name: string;

  // @swagger.ApiProperty({ description: 'Номер телефона', example: '9265126677' })
  @sequelize.Column
  phone: string;

  @sequelize.Column({ allowNull: true })
  position: string;

  //@swagger.ApiPropertyOptional({ description: 'Таймзона', example: 'Europe/Saratov' })
  @sequelize.Column({ allowNull: true })
  timezone: string;

  //@swagger.ApiProperty({ type: () => userConfigDTO })
  @sequelize.Column({ type: sequelize.DataType.JSON, defaultValue: {} })
  config: {
    currentProject: object;
    phoneCode: string;
  };

  @sequelize.HasMany(() => models.project2user, 'user_id')
  projectList: types['models']['project2user'][];

  @sequelize.HasMany(() => models.task, 'exec_user')
  execTaskList: types['models']['task'][];

  @sequelize.HasMany(() => models.task2user, 'exec_user')
  taskList: types['models']['task2user'][];

  @sequelize.HasMany(() => models.user2user, 'userId')
  contactList: types['models']['user2user'][];

  @sequelize.HasMany(() => models.user2user, 'contactId')
  relativeContactList: types['models']['user2user'][];

  @sequelize.CreatedAt
  addTime: Date;
  @sequelize.UpdatedAt
  updateTime: Date;
  @sequelize.DeletedAt
  deleteTime: Date;
}

@sequelize.Table({ tableName: 'user_to_user' })
export class UserToUser extends sequelize.Model {
  @sequelize.ForeignKey(() => models.user)
  @sequelize.Column
  userId: number;
  @sequelize.BelongsTo(() => models.user)
  user: types['models']['user'];

  @sequelize.ForeignKey(() => models.user)
  @sequelize.Column
  contactId: number;
  @sequelize.BelongsTo(() => models.user)
  relUser: types['models']['user'];

  @sequelize.Comment('приоритет')
  @sequelize.Column
  priority: number;

  @sequelize.CreatedAt
  addTime: Date;
  @sequelize.UpdatedAt
  updateTime: Date;
  @sequelize.DeletedAt
  deleteTime: Date;
}

export class userCurrentProjectDTO {
  @swagger.ApiProperty({ description: 'Идентификатор в БД' })
  id: number;
  @swagger.ApiProperty({ description: 'Название', example: 'Проект №1' })
  title: string;
}

export class userCodeQueryDTO {
  @swagger.ApiProperty({ example: '4523', description: 'Проверочный код из СМС' })
  code: string;
}

class userConfigDTO {
  @swagger.ApiPropertyOptional({ description: 'Код страны (без префикса "+")', example: '7' })
  phoneCode: string;
}

class userConfigWithCurProjectDTO {
  @swagger.ApiPropertyOptional({ description: 'Код страны (без префикса "+")', example: '7' })
  phoneCode: string;
  @swagger.ApiPropertyOptional({ type: () => userCurrentProjectDTO })
  currentProject: object;
}

export class userAuthQueryDataDTO {
  @swagger.ApiProperty({ description: 'Номер телефона', example: '9265126677' })
  phone?: string;
  @swagger.ApiPropertyOptional({ type: () => userConfigDTO })
  config?: object;
}
export class userAuthQueryDTO {
  @swagger.ApiProperty({ type: () => userAuthQueryDataDTO, description: 'schema: userAuthQueryDataDTO' })
  userData: userAuthQueryDataDTO;
  @swagger.ApiPropertyOptional({ description: 'Не отправлять СМС', example: true, type: 'boolean | null' })
  preventSendSms: boolean;
}

export class userGetOneQueryDTO {
  @swagger.ApiProperty({ description: 'ID пользователя' })
  userId: number;
}

class userProjectListDTO {
  @swagger.ApiPropertyOptional({
    type: 'string',
    example: 'owner',
    enum: ['owner', 'exec'],
    description: 'Роль в проекте',
  })
  role: string;
  @swagger.ApiProperty({ description: 'ID проекта' })
  projectId: number;
  @swagger.ApiPropertyOptional({ description: 'Отметка личного проекта', example: true, type: 'boolean | null' })
  personal: boolean;
  @swagger.ApiPropertyOptional({ description: 'Имя пользователя в проекте', example: 'Коля', type: 'string | null' })
  userName: string;
}

class userContactListDTO {
  @swagger.ApiProperty({ description: 'ID пользователя-контакта' })
  contactId: number;
  @swagger.ApiPropertyOptional({ description: 'Отметка избранного контакта', type: 'number | null' })
  priority: number;
}

export class userGetOneAnswerDTO {
  @swagger.ApiProperty({ description: 'ID пользователя' })
  id: number;
  @swagger.ApiProperty({ description: 'Номер телефона', example: '9265126677' })
  phone: string;
  @swagger.ApiProperty({ description: 'Имя пользователя', example: 'Николай', type: 'string' })
  name: string;
  @swagger.ApiPropertyOptional({ description: 'Описание контакта', example: 'CEO в Wazzup', type: 'string | null' })
  position: string;
  @swagger.ApiProperty({ description: 'Таймзона', example: 'Europe/Saratov' })
  timezone: string;
  @swagger.ApiProperty({ type: () => userConfigWithCurProjectDTO })
  config: object;
  @swagger.ApiPropertyOptional({ type: () => [userProjectListDTO] })
  projectList: object;
  @swagger.ApiPropertyOptional({ type: () => [userContactListDTO] })
  contactList: object;
}

export class userSearchQueryDTO {
  userId?: number;
  @swagger.ApiPropertyOptional({ description: 'Строка запроса', example: 'Петров' })
  query: string;
  @swagger.ApiPropertyOptional({ description: 'Поиск по всем пользователям (не только в контактах)', example: true })
  globalSearch?: boolean;
  @swagger.ApiPropertyOptional({ description: 'Лимит', example: 10 })
  limit?: number;
}

export class userSearchAnswerDTO {
  @swagger.ApiProperty({ description: 'ID пользователя' })
  id: number;
  @swagger.ApiProperty({ description: 'Номер телефона', example: '9265126677' })
  phone: string;
  @swagger.ApiProperty({ description: 'Имя пользователя', example: 'Петров' })
  name: string;
  @swagger.ApiPropertyOptional({ description: 'ID файла-иконки', type: 'number | null' })
  iconFileId: number;
}

export class userChangeCurrentProjectQueryDTO {
  @swagger.ApiProperty({ description: 'ID проекта' })
  projectId: number;
}

export class userAddContactQueryDTO {
  @swagger.ApiProperty({ description: 'ID пользователя-контакта' })
  contactId: number;
}

export class userUpdateQueryDataDTO {
  phone?: string;
  @swagger.ApiPropertyOptional({ description: 'Имя пользователя', example: 'Николай' })
  name?: string;
  @swagger.ApiPropertyOptional({ description: 'Описание контакта', example: 'CEO в Wazzup' })
  position?: string;
  @swagger.ApiPropertyOptional({ description: 'Таймзона', example: 'Europe/Saratov' })
  timezone?: string;
  @swagger.ApiPropertyOptional({ type: () => userConfigDTO })
  config?: object;
}

export class userUpdateQueryDTO {
  @swagger.ApiProperty({ description: 'ID пользователя' })
  userId: number;
  @swagger.ApiProperty({ type: () => userUpdateQueryDataDTO, description: 'schema: userUpdateQueryDataDTO' })
  userData: userUpdateQueryDataDTO;
  @swagger.ApiPropertyOptional({ type: 'string', format: 'binary' })
  iconFile: types['models']['file'];
}
