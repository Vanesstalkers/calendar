import * as swagger from '@nestjs/swagger';

class currentProject {
  @swagger.ApiProperty({ description: 'Идентификатор в БД', example: 1 })
  id: number;
  @swagger.ApiProperty({ description: 'Название', example: 'Проект №1' })
  title: string;
}

export class SessionStorageI {
  @swagger.ApiProperty({ type: 'number | null', description: 'Идентификатор в БД', example: 1 })
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
    type: () => currentProject,
  })
  currentProject?: object;
}
