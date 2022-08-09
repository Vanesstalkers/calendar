import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { models, types } from '../globalImport';

@sequelize.Table({ tableName: 'project' })
export class Project extends sequelize.Model {
  @sequelize.PrimaryKey
  @sequelize.AutoIncrement
  @sequelize.Column
  id: number;

  @swagger.ApiPropertyOptional({ type: 'string', example: 'Проект №1', description: 'Название проекта' })
  @sequelize.Column
  title: string;

  @sequelize.Column({ type: sequelize.DataType.JSON, defaultValue: {} })
  config: object;

  @swagger.ApiPropertyOptional({ type: Array, example: '[{"id":1},{"id":2}]', description: 'Список проектов' })
  @sequelize.HasMany(() => models.project2user, 'project_id')
  __projecttouser: types['models']['project2user'][];

  @swagger.ApiProperty({ type: () => [models.task] })
  @sequelize.HasMany(() => models.task, 'project_id')
  __task: types['models']['task'][];

  @sequelize.CreatedAt
  add_time: Date;
  @sequelize.UpdatedAt
  update_time: Date;
  @sequelize.DeletedAt
  delete_time: Date;
}

class projectUpdateQueryDataDTO {
  @swagger.ApiPropertyOptional({ type: 'string', example: 'Проект №1', description: 'Название проекта' })
  title: string;
}

export class projectUpdateQueryDTO {
  @swagger.ApiPropertyOptional({ description: 'ID проекта' })
  projectId: number;
  @swagger.ApiProperty({ type: () => projectUpdateQueryDataDTO, description: 'schema: projectUpdateQueryDataDTO' })
  projectData: projectUpdateQueryDataDTO;
}
