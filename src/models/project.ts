import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { models, types } from '../globalImport';

@sequelize.Table({ tableName: 'project' })
export class Project extends sequelize.Model {
  @sequelize.PrimaryKey
  @sequelize.AutoIncrement
  @sequelize.Column
  id: number;

  @sequelize.Column
  title: string;

  @sequelize.Column({ type: sequelize.DataType.JSON, defaultValue: {} })
  config: object;

  @swagger.ApiProperty({ type: ()=>[models.project2user] })
  @sequelize.HasMany(() => models.project2user, 'project_id')
  __user: types['models']['project2user'][];

  @swagger.ApiProperty({ type: ()=>[models.task] })
  @sequelize.HasMany(() => models.task, 'project_id')
  __task: types['models']['task'][];


  @sequelize.CreatedAt
  add_time: Date;
  @sequelize.UpdatedAt
  update_time: Date;
  @sequelize.DeletedAt
  delete_time: Date;
}