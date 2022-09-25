import * as swagger from '@nestjs/swagger';

import { fileListItemDTO } from '../file/file.dto';

export class commentDTO {
  @swagger.ApiProperty({ description: 'Тест комментария', type: 'string' })
  text?: string;
  deleteTime?: Date;
}

export class commentCreateQueryDTO {
  @swagger.ApiProperty({ type: commentDTO })
  commentData: commentDTO;
  @swagger.ApiProperty({ description: 'ID задачи' })
  taskId: number;
}

export class commentUpdateQueryDTO {
  @swagger.ApiProperty({ type: commentDTO })
  commentData: commentDTO;
  @swagger.ApiProperty({ description: 'ID комментария' })
  commentId: number;
}

export class commentDeleteQueryDTO {
  @swagger.ApiProperty({ description: 'ID комментария' })
  commentId: number;
}

export class commentListItemDTO {
  @swagger.ApiProperty({ description: 'ID комментария' })
  commentId: number;
  @swagger.ApiProperty({ description: 'Тест комментария', type: 'string' })
  text: string;
  @swagger.ApiProperty({ description: 'Файлы задачи', type: [fileListItemDTO] })
  fileList: fileListItemDTO[];
}
