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
  link: string;

  @swagger.ApiProperty({
    type: 'string',
    example: 'user',
    description: 'Тип сущности-родителя',
  })
  @sequelize.Column
  parent_type: string;

  @swagger.ApiProperty({
    type: 'number',
    example: 1,
    description: 'ID сущности-родителя',
  })
  @sequelize.Column
  parent_id: number;

  @swagger.ApiProperty({
    type: 'string',
    example: 'icon',
    description: 'Тип файла',
  })
  @sequelize.Column
  file_type: string;

  @sequelize.Column
  file_name: string;

  @sequelize.Column
  file_extension: string;

  @sequelize.Column
  file_mimetype: string;

  @sequelize.CreatedAt
  add_time: Date;
  @sequelize.UpdatedAt
  update_time: Date;
  @sequelize.DeletedAt
  delete_time: Date;
}
