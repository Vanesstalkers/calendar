import { Entity, Column, PrimaryGeneratedColumn, Timestamp } from 'typeorm';

@Entity()
export default class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  require: number;

  @Column({ type: 'timestamptz' })
  exec_end_time: Date;
}
