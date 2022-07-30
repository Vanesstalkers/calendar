import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { models, types } from '../globalImport';

@sequelize.Table({ tableName: 'user' })
export class User extends sequelize.Model {
  // non-db fields
  @swagger.ApiPropertyOptional({ description: 'Не отправлять СМС', example: 'true' })
  preventSendSms: boolean;

  // db fields
  @sequelize.PrimaryKey
  @sequelize.AutoIncrement
  @sequelize.Column
  id: number;

  @sequelize.Column
  name: string;

  @swagger.ApiProperty({ description: 'Номер телефона', example: '9265126677' })
  @sequelize.Column
  phone: string;

  @sequelize.Column({ allowNull: true })
  position: string;

  @sequelize.Column({ allowNull: true })
  timezone: string;

  @sequelize.Column({ type: sequelize.DataType.JSON, defaultValue: {} })
  config: {
    currentProject: object;
  };

  @sequelize.HasMany(() => models.project2user, 'user_id')
  __project: types['models']['project2user'][];

  @sequelize.HasMany(() => models.task, 'exec_user')
  __task: types['models']['task'][];

  @sequelize.HasMany(() => models.task2user, 'exec_user')
  __tasktouser: types['models']['task2user'][];

  @sequelize.HasMany(() => models.user2user, 'user_id')
  __usertouser: types['models']['user2user'][];

  @sequelize.HasMany(() => models.user2user, 'user_rel_id')
  __relusertouser: types['models']['user2user'][];

  @sequelize.CreatedAt
  add_time: Date;
  @sequelize.UpdatedAt
  update_time: Date;
  @sequelize.DeletedAt
  delete_time: Date;
}
