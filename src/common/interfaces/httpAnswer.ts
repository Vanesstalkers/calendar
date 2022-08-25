import * as swagger from '@nestjs/swagger';
import { interfaces } from '../../globalImport';

export class emptyAnswerI {}

export class createdAnswerI {
  constructor(...refs: any[]) {
    return {
      status: 200,
      schema: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            example: 'ok',
          },
          data: {
            type: 'object',
            required: ['id'],
            properties: {
              id: {
                type: 'number',
                example: 1,
              },
            },
          },
        },
      },
    };
  }
}

export class successAnswerI {
  constructor(data: { models?: any[]; props?: any; code?: number } = {}) {
    return {
      status: data.code || 200,
      schema: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', example: 'ok' },
          data: data.models?.length
            ? { type: 'object', oneOf: data.models.map((ref) => ({ $ref: swagger.getSchemaPath(ref) })) }
            : undefined,
          ...(data.props || {}),
        },
      },
    };
  }
}

export class searchAnswerI {
  constructor(data: { model?: any; props?: any; code?: number } = {}) {
    return {
      status: data.code || 200,
      schema: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', example: 'ok' },
          data: {
            type: 'object',
            required: ['endOfList', 'resultList'],
            properties: {
              endOfList: {
                description: 'Признак отсутствия слещующих элементов для поиска',
                type: 'boolean',
                example: false,
              },
              resultList: {
                oneOf: [{ type: 'array', items: { $ref: swagger.getSchemaPath(data.model) } }],
              },
              ...(data.props || {}),
            },
          },
        },
      },
    };
  }
}

export class exceptonAnswerI {
  @swagger.ApiProperty({ example: 'err', description: 'Статус ответа' })
  status: string;
  @swagger.ApiProperty({ description: 'Метка времени' })
  timestamp: Date;
  @swagger.ApiProperty({ description: 'URL запроса' })
  path: string;
  @swagger.ApiPropertyOptional({ description: 'Сообщение об ошибке' })
  msg?: string;
  @swagger.ApiPropertyOptional({ description: 'Код ошибки' })
  code?: string;
}
