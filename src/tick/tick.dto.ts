import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { models, types } from '../globalImport';

@sequelize.Table({ tableName: 'tick' })
export class Tick extends sequelize.Model {
  @sequelize.PrimaryKey
  @sequelize.AutoIncrement
  @sequelize.Column
  id: number;

  @sequelize.ForeignKey(() => models.task)
  @sequelize.Column
  task_id: number;
  @sequelize.BelongsTo(() => models.task)
  task: types['models']['task'];

  @swagger.ApiProperty({ type: 'string', description: 'Описание пункта' })
  @sequelize.Column
  text: string;

  @swagger.ApiPropertyOptional({
    type: 'string',
    example: 'ready',
    enum: ['', 'ready'],
    description: 'Статус выполнения',
  })
  @sequelize.Column({ defaultValue: '' })
  status: string;

  @sequelize.CreatedAt
  add_time: Date;
  @sequelize.UpdatedAt
  update_time: Date;
  @sequelize.DeletedAt
  delete_time: Date;
}

export class createTickDTO {
  @swagger.ApiProperty({ type: () => models.tick })
  tickData: types['models']['tick'];
  @swagger.ApiPropertyOptional({ description: 'ID задачи' })
  taskId: number;
}

export class updateTickDTO {
  @swagger.ApiProperty({ type: () => models.tick })
  tickData: types['models']['tick'];
  @swagger.ApiPropertyOptional({ description: 'ID пункта чек-листа' })
  tickId: number;
}
