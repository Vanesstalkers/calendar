import * as swagger from '@nestjs/swagger';

import { userGetOneAnswerProjectDTO } from '../project/project.dto';
import { fileDTO, fileUploadQueryFileDTO } from '../file/file.dto';

export class userCodeQueryDTO {
  @swagger.ApiProperty({ description: 'Проверочный код из СМС', example: '4523' })
  code: string;
}

class userConfigDTO {
  @swagger.ApiPropertyOptional({ description: 'Код страны (без префикса "+")', example: '7' })
  phoneCode: string;
}

class userConfigUpdateDTO extends userConfigDTO {
  @swagger.ApiPropertyOptional({ description: 'Проекты, отображаемые в личном', example: [10, 31] })
  showProjectsInPersonal: number[];
}

class userConfigWithCurProjectDTO {
  @swagger.ApiPropertyOptional({ description: 'Код страны (без префикса "+")', example: '7' })
  phoneCode: string;
  @swagger.ApiProperty({ description: 'ID текущего проекта', example: 0 })
  currentProjectId?: number;
  @swagger.ApiProperty({ description: 'ID текущего проекта', example: 0 })
  personalProjectId?: number;
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
  @swagger.ApiPropertyOptional({
    description: 'Отключить таймаут на вызов метода user/auth',
    type: 'boolean | null',
    example: true,
  })
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
  @swagger.ApiPropertyOptional({ description: 'Таймзона', example: 'Europe/Saratov' })
  timezone: string;
  @swagger.ApiProperty({ description: 'Конфиг пользователя', type: userConfigWithCurProjectDTO })
  config: userConfigWithCurProjectDTO;
  sessions: object;
  @swagger.ApiProperty({ description: 'Список проектов', type: [userGetOneAnswerProjectDTO] })
  projectList: userGetOneAnswerProjectDTO[];
  // @swagger.ApiProperty({ description: 'Список контактов', type: [userContactListDTO] })
  // contactList: object;
  @swagger.ApiProperty({ description: 'Список контактов', type: [userGetOneAnswerProjectDTO] })
  contactList: userGetOneAnswerProjectDTO[];
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
  projectId: string;
}

export class userAddContactQueryDTO {
  @swagger.ApiProperty({ description: 'ID пользователя-контакта' })
  contactId: number;
}

export class userUpdateQueryDataDTO {
  phone?: string;
  @swagger.ApiPropertyOptional({ description: 'Имя пользователя', example: 'Николай' })
  name?: string;
  @swagger.ApiPropertyOptional({ description: 'Таймзона', example: 'Europe/Saratov' })
  timezone?: string;
  @swagger.ApiPropertyOptional({ description: 'Конфиг пользователя', type: userConfigUpdateDTO })
  config?: object;
  sessions?: object;
  iconFile?: fileDTO;
}

export class userUpdateQueryDTO {
  @swagger.ApiProperty({ description: 'ID пользователя' })
  userId: number;
  @swagger.ApiProperty({ description: 'schema: userUpdateQueryDataDTO', type: userUpdateQueryDataDTO })
  userData: userUpdateQueryDataDTO;
  @swagger.ApiProperty({ type: fileUploadQueryFileDTO })
  iconFile: fileUploadQueryFileDTO;
}

export class userUpdateWithFormdataQueryDTO {
  @swagger.ApiProperty({ description: 'ID пользователя' })
  userId: number;
  @swagger.ApiProperty({ description: 'schema: userUpdateQueryDataDTO', type: userUpdateQueryDataDTO })
  userData: userUpdateQueryDataDTO;
  @swagger.ApiPropertyOptional({ description: 'Файл иконки', type: 'string', format: 'binary' })
  iconFile: fileDTO;
}

export class userLinkWsAnswerDTO {
  @swagger.ApiProperty({ description: "Код для отправки в socket.emit('linkSession', [code])" })
  linkCode: string;
}