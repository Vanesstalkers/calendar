import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { models, types } from '../globalImport';

@sequelize.Table({ tableName: 'file' })
export class File extends sequelize.Model {

  @sequelize.PrimaryKey
  @sequelize.AutoIncrement
  @sequelize.Column
  id: number;

  @sequelize.Comment('ссылка на вложенный контент')
  @sequelize.Column
  link: string

  @sequelize.Column
  parent_type: string

  @sequelize.Column
  parent_id: number

  @sequelize.Column
  file_type: string

  @sequelize.CreatedAt
  add_time: Date;
  @sequelize.UpdatedAt
  update_time: Date;
  @sequelize.DeletedAt
  delete_time: Date;
}
