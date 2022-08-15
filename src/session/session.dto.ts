import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { models, types } from '../globalImport';

export interface sessionDTO {
  storageId?: string;
  /* 
    добавить сюда userId мы не можем, так как процесс авторизации через СМС (в текущей реализации)
    не позволяет записывать значения в сессию синхронно
  */
}

import { userCurrentProjectDTO } from '../user/user.dto';

export class sessionStorageDTO {
  @swagger.ApiProperty({ description: 'Идентификатор в БД', type: 'number | null', example: 0 })
  userId?: number;
  @swagger.ApiProperty({ description: 'Номер телефона', example: '9265126677' })
  phone?: string;
  @swagger.ApiProperty({ description: 'Отметке об аутентификации', example: true })
  login?: boolean;
  @swagger.ApiProperty({ description: 'Отметке о регистрации', example: true })
  registration?: boolean;
  @swagger.ApiProperty({ description: 'Активный проект', type: userCurrentProjectDTO })
  currentProject?: object;
}