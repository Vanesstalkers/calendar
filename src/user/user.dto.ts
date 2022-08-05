import * as swagger from '@nestjs/swagger';
import {
  decorators,
  interfaces,
  models,
  types,
  httpAnswer,
  interceptors,
} from '../globalImport';

export class userUpdateDTO {
  // @swagger.ApiPropertyOptional({ example: 1, description: 'ID пользователя' })
  // userId?: number;
  @swagger.ApiProperty({ type: () => models.user })
  userData: types['models']['user'];
  @swagger.ApiProperty({ type: 'string', format: 'binary' })
  iconFile: types['models']['file'];
}
