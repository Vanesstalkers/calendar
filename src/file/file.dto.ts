import * as swagger from '@nestjs/swagger';
import {
  decorators,
  interfaces,
  models,
  types,
  httpAnswer,
  interceptors,
} from '../globalImport';

export class fileUploadDTO {
  @swagger.ApiProperty({ type: () => models.file })
  fileData: types['models']['file'];
  @swagger.ApiProperty({ type: 'string', format: 'binary' })
  file: types['models']['file'];
}
