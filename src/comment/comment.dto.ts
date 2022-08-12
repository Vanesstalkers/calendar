import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { models, types } from '../globalImport';

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

  @swagger.ApiProperty({ type: 'string', description: 'Тест комментария' })
  @sequelize.Column
  text: string;

  @sequelize.CreatedAt
  addTime: Date;
  @sequelize.UpdatedAt
  updateTime: Date;
  @sequelize.DeletedAt
  deleteTime: Date;
}

export class createCommentDTO {
  @swagger.ApiProperty({ type: () => models.comment })
  commentData: types['models']['comment'];
  @swagger.ApiPropertyOptional({ description: 'ID задачи' })
  taskId: number;
}

export class updateCommentDTO {
  @swagger.ApiProperty({ type: () => models.comment })
  commentData: types['models']['comment'];
  @swagger.ApiPropertyOptional({ description: 'ID комментария' })
  commentId: number;
}
