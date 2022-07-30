import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';

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
            oneOf: refs.map((ref) => ({ $ref: getSchemaPath(ref) })),
          },
        },
      },
    };
  }
}

export class exceptonAnswerDTO {
    @ApiProperty({ example: 'err', description: 'Статус ответа' })
    status: string;
    @ApiProperty({ description: 'Метка времени' })
    timestamp: Date;
    @ApiProperty({ description: 'URL запроса' })
    path: string;
    @ApiPropertyOptional({ description: 'Сообщение об ошибке' })
    msg?: string;
  }