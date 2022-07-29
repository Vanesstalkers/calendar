import {
  Column,
  Model,
  Table,
  DataType,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  Comment,
  AutoIncrement,
} from 'sequelize-typescript';


@Table({ tableName: 'file' })
export class File extends Model {

  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Comment('ссылка на вложенный контент')
  @Column
  link: string

  @Column
  parent_type: string

  @Column
  parent_id: number

  @Column
  file_type: string

  @CreatedAt
  add_time: Date;
  @UpdatedAt
  update_time: Date;
  @DeletedAt
  delete_time: Date;
}
