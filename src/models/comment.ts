import * as sequelize from 'sequelize-typescript';

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

  @sequelize.Comment('текст комментария')
  @sequelize.Column
  text: string

  @sequelize.CreatedAt
  add_time: Date;
  @sequelize.UpdatedAt
  update_time: Date;
  @sequelize.DeletedAt
  delete_time: Date;
}
