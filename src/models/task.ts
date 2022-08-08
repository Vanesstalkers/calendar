import * as sequelize from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import { models, types } from '../globalImport';

@sequelize.Table({ tableName: 'task' })
export class Task extends sequelize.Model {
  @sequelize.PrimaryKey
  @sequelize.AutoIncrement
  @sequelize.Column
  id: number;

  @sequelize.ForeignKey(() => models.project)
  @sequelize.Column
  project_id: number;
  @sequelize.BelongsTo(() => models.project)
  project: types['models']['project'];

  @sequelize.Comment('обязательность')
  @sequelize.Column({ defaultValue: true })
  require: boolean;

  @swagger.ApiProperty({
    description: 'когда выполнена',
    example: '07.07.1977',
  })
  @sequelize.Column({ allowNull: true })
  exec_end_time: Date;

  @sequelize.ForeignKey(() => models.user)
  @sequelize.Comment('фактический исполнитель')
  @sequelize.Column
  exec_user: number;
  @sequelize.BelongsTo(() => models.user)
  user: types['models']['user'];

  @swagger.ApiProperty({ description: 'Заголовок задачи' })
  @sequelize.Column
  title: string;

  @swagger.ApiProperty({ description: 'Описание задачи' })
  @sequelize.Column(sequelize.DataType.TEXT)
  info: string;

  @sequelize.Comment('дата задачи')
  @sequelize.Column
  date: Date;

  @sequelize.Comment('время начала')
  @sequelize.Column
  start_time: Date;

  @sequelize.Comment('время окончания')
  @sequelize.Column({ allowNull: true })
  end_time: Date;

  @sequelize.Comment('формат учета времени')
  @sequelize.Column
  time_type: string;

  @sequelize.Comment('регулярная задача')
  @sequelize.Column({ defaultValue: true })
  regular: boolean;

  @sequelize.Comment('внешний источник задачи')
  @sequelize.Column
  ext_source: string;

  @sequelize.Comment('внешний получатель')
  @sequelize.Column
  ext_destination: string;

  @sequelize.HasMany(() => models.taskgroup, 'task_id')
  __taskgroup: types['models']['taskgroup'][];

  @sequelize.HasMany(() => models.hashtag, 'task_id')
  __hashtag: types['models']['hashtag'][];

  @swagger.ApiPropertyOptional({
    type: Array,
    example: '[{"id":1},{"id":2}]',
    description: 'Список исполнителей (без постановщика)',
  })
  @sequelize.HasMany(() => models.task2user, 'task_id')
  __tasktouser: types['models']['task2user'][];

  @sequelize.HasMany(() => models.tick, 'task_id')
  __tick: types['models']['tick'][];

  @sequelize.HasMany(() => models.comment, 'task_id')
  __comment: types['models']['comment'][];

  @sequelize.CreatedAt
  add_time: Date;
  @sequelize.UpdatedAt
  update_time: Date;
  @sequelize.DeletedAt
  delete_time: Date;
}
