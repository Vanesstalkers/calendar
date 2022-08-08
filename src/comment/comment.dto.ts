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
  task_id: number;
  @sequelize.BelongsTo(() => models.task)
  task: types['models']['task'];

  @swagger.ApiProperty({ type: 'string', description: 'Тест комментария' })
  @sequelize.Column
  text: string

  @sequelize.HasMany(() => models.comment, 'parent_id')
  __comment: types['models']['comment'][];

  @sequelize.CreatedAt
  add_time: Date;
  @sequelize.UpdatedAt
  update_time: Date;
  @sequelize.DeletedAt
  delete_time: Date;
}

export class createCommentDTO {
  @swagger.ApiProperty({ type: () => models.comment })
  commentData: types['models']['comment'];
  @swagger.ApiPropertyOptional({ example: 1, description: 'ID задачи' })
  taskId: number;
}

export class updateCommentDTO {
  @swagger.ApiProperty({ type: () => models.comment })
  commentData: types['models']['comment'];
  @swagger.ApiPropertyOptional({
    example: 1,
    description: 'ID комментария',
  })
  commentId: number;
}
