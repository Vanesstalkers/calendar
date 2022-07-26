import * as swagger from '@nestjs/swagger';

export class searchPhoneCodeQueryDTO {
  @swagger.ApiProperty({ type: 'string', example: 'Afg...', description: 'Строка поиска' })
  query: string;
  @swagger.ApiPropertyOptional({ type: 'number', example: 50, description: 'Лимит на количество результатов в ответе' })
  limit: string;
  @swagger.ApiPropertyOptional({ description: 'Сдвиг для поиска', example: 0 })
  offset: string;
}

export class searchPhoneCodeAnswerDTO {
  @swagger.ApiProperty({ example: 'Afghanistan' })
  name: string;
  @swagger.ApiProperty({ example: '+93' })
  dial_code: string;
  @swagger.ApiProperty({ example: 'AF' })
  code: string;
}

export class searchTimezoneCodeQueryDTO {
  @swagger.ApiProperty({ type: 'string', example: 'Eur...', description: 'Строка поиска' })
  query: string;
  @swagger.ApiPropertyOptional({ type: 'number', example: 50, description: 'Лимит на количество результатов в ответе' })
  limit: string;
  @swagger.ApiPropertyOptional({ description: 'Сдвиг для поиска', example: 0 })
  offset: string;
}

export class searchTimezoneCodeAnswerDTO {
  @swagger.ApiProperty({ example: 'Europe/Astrakhan' })
  name: string;
  @swagger.ApiProperty({ example: '+04' })
  abbrev: string;
  @swagger.ApiProperty({ example: '04:00:00' })
  utc_offset: string;
  is_dst: boolean;
}
