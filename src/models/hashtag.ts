import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { models, types } from '../globalImport';

@sequelize.Table({ tableName: 'hashtag' })
export class Hashtag extends sequelize.Model {

  @sequelize.ForeignKey(() => models.task)
  @sequelize.Column
  task_id: number;
  @sequelize.BelongsTo(() => models.task)
  task: types['models']['task'];

  @sequelize.Comment('хэштег')
  @sequelize.Column
  hashtag: string

  @sequelize.CreatedAt
  add_time: Date;
  @sequelize.UpdatedAt
  update_time: Date;
  @sequelize.DeletedAt
  delete_time: Date;
}
