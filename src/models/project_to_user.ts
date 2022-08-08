import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { models, types } from '../globalImport';

@sequelize.Table({ tableName: 'project_to_user' })
export class ProjectToUser extends sequelize.Model {
  @sequelize.Column({ allowNull: true })
  @swagger.ApiProperty({ description: 'роль пользователя в проекте' })
  role: string;

  @sequelize.ForeignKey(() => models.user)
  @sequelize.Column
  user_id: number;
  @swagger.ApiProperty({ type: () => models.user })
  @sequelize.BelongsTo(() => models.user)
  user: types['models']['user'];

  @sequelize.ForeignKey(() => models.project)
  @sequelize.Column
  project_id: number;
  @sequelize.BelongsTo(() => models.project)
  project: types['models']['project'];

  @sequelize.Comment('личный проект')
  @sequelize.Column({ defaultValue: false })
  personal: boolean;

  @sequelize.Comment('имя пользователя в проекте')
  @sequelize.Column
  user_name: string;

  @sequelize.Comment('персональные настройки видимости')
  @sequelize.Column({ type: sequelize.DataType.JSON, defaultValue: {} })
  config: object;

  @sequelize.CreatedAt
  add_time: Date;
  @sequelize.UpdatedAt
  update_time: Date;
  @sequelize.DeletedAt
  delete_time: Date;
}
