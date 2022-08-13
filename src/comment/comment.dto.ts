import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { models, types } from '../globalImport';

import { fileListItemDTO } from '../file/file.dto';

@sequelize.Table({ tableName: 'comment' })
export class Comment extends sequelize.Model {
  @sequelize.PrimaryKey
  @sequelize.AutoIncrement
  @sequelize.Column
  id: number;

  @sequelize.ForeignKey(() => models.task)
  @sequelize.Column
  taskId: number;
  @sequelize.BelongsTo(() => models.task)
  task: types['models']['task'];

  @sequelize.Column
  text: string;

  @sequelize.CreatedAt
  addTime: Date;
  @sequelize.UpdatedAt
  updateTime: Date;
  @sequelize.DeletedAt
  deleteTime: Date;
}

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
