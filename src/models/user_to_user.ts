import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { models, types } from '../globalImport';

@sequelize.Table({ tableName: 'user_to_user' })
export class UserToUser extends sequelize.Model {

  @sequelize.ForeignKey(() => models.user)
  @sequelize.Column
  user_id: number;
  @sequelize.BelongsTo(() => models.user)
  user: types['models']['user'];


  @sequelize.ForeignKey(() => models.user)
  @sequelize.Column
  user_rel_id: number;
  @sequelize.BelongsTo(() => models.user)
  reluser: types['models']['user'];

  @sequelize.Comment('приоритет')
  @sequelize.Column
  priority: number


  @sequelize.CreatedAt
  add_time: Date;
  @sequelize.UpdatedAt
  update_time: Date;
  @sequelize.DeletedAt
  delete_time: Date;
}
