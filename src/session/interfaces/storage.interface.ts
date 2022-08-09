import * as swagger from '@nestjs/swagger';

import { userCurrentProjectDTO } from '../../user/user.dto'

export class SessionStorageI {
  @swagger.ApiProperty({ type: 'number | null', description: 'Идентификатор в БД' })
  userId?: number;
  @swagger.ApiProperty({ description: 'Номер телефона', example: '9265126677' })
  phone?: string;
  @swagger.ApiProperty({
    description: 'Отметке об аутентификации',
    example: true,
  })
  login?: boolean;
  @swagger.ApiProperty({ description: 'Отметке о регистрации', example: true })
  registration?: boolean;
  @swagger.ApiProperty({
    description: 'Активный проект',
    type: () => userCurrentProjectDTO,
  })
  currentProject?: object;
}
