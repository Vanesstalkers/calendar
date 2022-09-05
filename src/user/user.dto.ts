import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { interfaces, models, types } from '../globalImport';

import { userGetOneAnswerProjectDTO } from '../project/project.dto';

@sequelize.Table({ tableName: 'user' })
export class User extends sequelize.Model {
  @sequelize.PrimaryKey
  @sequelize.AutoIncrement
  @sequelize.Column
  id: number;

  @sequelize.Column
  name: string;

  @sequelize.Column
  phone: string;

  @sequelize.Column({ allowNull: true })
  position: string;

  @sequelize.Column({ allowNull: true })
  timezone: string;

  @sequelize.Column({ type: sequelize.DataType.JSON, defaultValue: {} })
  config: { currentProjectId: number; phoneCode: string };

  @sequelize.HasMany(() => models.project2user, 'userId')
  projectList: types['models']['project2user'][];

  @sequelize.HasMany(() => models.task, 'execUserId')
  execTaskList: types['models']['task'][];

  @sequelize.HasMany(() => models.task2user, 'userId')
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

export class userCodeQueryDTO {
  @swagger.ApiProperty({ description: 'Проверочный код из СМС', example: '4523' })
  code: string;
}

class userConfigDTO {
  @swagger.ApiPropertyOptional({ description: 'Код страны (без префикса "+")', example: '7' })
  phoneCode: string;
}

class userConfigUpdateDTO extends userConfigDTO {
  @swagger.ApiPropertyOptional({ description: 'Проекты, отображаемые в личном', example: [10,31] })
  showProjectsInPersonal: number[];
}

class userConfigWithCurProjectDTO {
  @swagger.ApiPropertyOptional({ description: 'Код страны (без префикса "+")', example: '7' })
  phoneCode: string;
  @swagger.ApiProperty({ description: 'ID текущего проекта', example: 0 })
  currentProjectId?: number;
}

export class userAuthQueryDataDTO {
  @swagger.ApiProperty({ description: 'Номер телефона', example: '9265126677' })
  phone?: string;
  @swagger.ApiPropertyOptional({ description: 'Имя пользователя', type: 'string', example: 'Николай' })
  name: string;
  @swagger.ApiPropertyOptional({ description: 'Таймзона пользователя', example: 'Europe/Saratov' })
  timezone: string;
  @swagger.ApiPropertyOptional({ description: 'Конфиг пользователя', type: userConfigDTO })
  config?: object;
}
export class userAuthQueryDTO {
  @swagger.ApiProperty({ description: 'schema: userAuthQueryDataDTO', type: userAuthQueryDataDTO })
  userData: userAuthQueryDataDTO;
  @swagger.ApiPropertyOptional({ description: 'Не отправлять СМС', type: 'boolean | null', example: true })
  preventSendSms: boolean;
  @swagger.ApiPropertyOptional({ description: 'Отключить таймаут на вызов метода user/auth', type: 'boolean | null', example: true })
  disableTimeout: boolean;
}

export class userGetOneQueryDTO {
  @swagger.ApiProperty({ description: 'ID пользователя' })
  userId: number;
}

class userContactListDTO {
  @swagger.ApiProperty({ description: 'ID пользователя-контакта' })
  contactId: number;
  @swagger.ApiPropertyOptional({ description: 'Признак избранного контакта', type: 'number | null', example: false })
  priority: number;
}

export class userGetOneAnswerDTO {
  @swagger.ApiProperty({ description: 'ID пользователя' })
  id: number;
  @swagger.ApiProperty({ description: 'Номер телефона', example: '9265126677' })
  phone: string;
  @swagger.ApiProperty({ description: 'Имя пользователя', type: 'string', example: 'Николай' })
  name: string;
  @swagger.ApiPropertyOptional({ description: 'ID файла-иконки', type: 'number | null', example: 0 })
  iconFileId: number;
  @swagger.ApiPropertyOptional({
    description: 'Описание контакта',
    type: 'string | null',
    example: 'Разработчик в Wazzup',
  })
  position: string;
  @swagger.ApiPropertyOptional({ description: 'Таймзона', example: 'Europe/Saratov' })
  timezone: string;
  @swagger.ApiProperty({ description: 'Конфиг пользователя', type: userConfigWithCurProjectDTO })
  config: object;
  @swagger.ApiProperty({ description: 'Список проектов', type: [userGetOneAnswerProjectDTO] })
  projectList: object;
  @swagger.ApiProperty({ description: 'Список контактов', type: [userContactListDTO] })
  contactList: object;
}

export class userSearchQueryDTO {
  userId?: number;
  @swagger.ApiProperty({ description: 'Строка запроса', example: 'Петров' })
  query: string;
  @swagger.ApiPropertyOptional({
    description: 'Поиск по всем пользователям (не только в контактах)',
    example: true,
    type: 'boolean | null',
  })
  globalSearch?: boolean;
  @swagger.ApiProperty({ description: 'Лимит на количество результатов в ответе', example: 50 })
  limit?: number;
  @swagger.ApiProperty({ description: 'Сдвиг для поиска', example: 0 })
  offset?: number;
}

export class userSearchAnswerDTO {
  @swagger.ApiProperty({ description: 'ID пользователя' })
  id: number;
  @swagger.ApiProperty({ description: 'Номер телефона', example: '9265126677' })
  phone: string;
  @swagger.ApiProperty({ description: 'Имя пользователя', example: 'Петров' })
  name: string;
  @swagger.ApiPropertyOptional({ description: 'ID файла-иконки', type: 'number | null', example: 0 })
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
  @swagger.ApiPropertyOptional({ description: 'Описание контакта', example: 'Разработчик в Wazzup' })
  position?: string;
  @swagger.ApiPropertyOptional({ description: 'Таймзона', example: 'Europe/Saratov' })
  timezone?: string;
  @swagger.ApiPropertyOptional({ description: 'Конфиг пользователя', type: userConfigUpdateDTO })
  config?: object;
}

export class userUpdateQueryDTO {
  @swagger.ApiProperty({ description: 'ID пользователя' })
  userId: number;
  @swagger.ApiProperty({ description: 'schema: userUpdateQueryDataDTO', type: userUpdateQueryDataDTO })
  userData: userUpdateQueryDataDTO;
  @swagger.ApiPropertyOptional({ description: 'Файл иконки', type: 'string', format: 'binary' })
  iconFile: types['models']['file'];
}
