import * as swagger from '@nestjs/swagger';

export class emptyAnswerDTO {}

export class successAnswerDTO {
  constructor(...refs: any[]) {
    return {
      status: 200,
      schema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'ok',
          },
          data: {
            oneOf: refs.map((ref) => ({ $ref: swagger.getSchemaPath(ref) })),
          },
        },
      },
    };
  }
}

export class exceptonAnswerDTO {
    @swagger.ApiProperty({ example: 'err', description: 'Статус ответа' })
    status: string;
    @swagger.ApiProperty({ description: 'Метка времени' })
    timestamp: Date;
    @swagger.ApiProperty({ description: 'URL запроса' })
    path: string;
    @swagger.ApiPropertyOptional({ description: 'Сообщение об ошибке' })
    msg?: string;
  }