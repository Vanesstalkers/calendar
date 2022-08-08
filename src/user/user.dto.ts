import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { models, types } from '../globalImport';

@sequelize.Table({ tableName: 'user' })
export class User extends sequelize.Model {
  @sequelize.PrimaryKey
  @sequelize.AutoIncrement
  @sequelize.Column
  id: number;

  @swagger.ApiPropertyOptional({
    description: 'Имя пользователя',
    example: 'Николай',
  })
  @sequelize.Column
  name: string;

  @swagger.ApiProperty({ description: 'Номер телефона', example: '9265126677' })
  @sequelize.Column
  phone: string;

  @sequelize.Column({ allowNull: true })
  position: string;

  @swagger.ApiPropertyOptional({
    description: 'Таймзона',
    example: 'Europe/Saratov',
  })
  @sequelize.Column({ allowNull: true })
  timezone: string;

  @swagger.ApiProperty({ type: 'object', example: '{"phoneCode": "+7"}' })
  @sequelize.Column({ type: sequelize.DataType.JSON, defaultValue: {} })
  config: {
    currentProject: object;
    phoneCode: string;
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

export class userUpdateQueryDTO {
  // @swagger.ApiPropertyOptional({ example: 1, description: 'ID пользователя' })
  // userId?: number;
  @swagger.ApiProperty({ type: () => models.user })
  userData: types['models']['user'];
  @swagger.ApiPropertyOptional({ type: 'string', format: 'binary' })
  iconFile: types['models']['file'];
}
