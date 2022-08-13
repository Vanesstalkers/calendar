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

  @swagger.ApiProperty({ description: 'Тип сущности-родителя', example: 'user', type: 'string' })
  @sequelize.Column
  parentType: string;

  @swagger.ApiProperty({ type: 'number', description: 'ID сущности-родителя' })
  @sequelize.Column
  parentId: number;

  @swagger.ApiProperty({ description: 'Тип файла', example: 'icon', type: 'string' })
  @sequelize.Column
  fileType: string;

  @sequelize.Column
  fileName: string;

  @sequelize.Column
  fileExtension: string;

  @sequelize.Column
  fileMimetype: string;

  @sequelize.CreatedAt
  addTime: Date;
  @sequelize.UpdatedAt
  updateTime: Date;
  @sequelize.DeletedAt
  deleteTime: Date;
}

export class fileDTO {
  @swagger.ApiProperty({ description: 'Тип сущности-родителя', example: 'user', type: 'string' })
  parentType: string;

  @swagger.ApiProperty({ description: 'ID сущности-родителя', type: 'number' })
  parentId: number;

  @swagger.ApiProperty({ description: 'Тип файла', example: 'icon', type: 'string' })
  fileType: string;
}

export class fileListItemDTO {
  @swagger.ApiProperty({ description: 'ID файла' })
  fileId: number;
  @swagger.ApiProperty({ description: 'Тип файла', example: 'icon', type: 'string' })
  fileType: string;
}

export class fileUploadQueryDTO {
  @swagger.ApiProperty({ type: fileDTO })
  fileData: fileDTO;
  @swagger.ApiProperty({ type: 'string', format: 'binary' })
  file: types['models']['file'];
}
