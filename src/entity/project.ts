import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';

import LinkProjectToUser from './project_to_user';

@Entity()
export default class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('json', { nullable: false, default: {} })
  config: object;

  @OneToMany(() => LinkProjectToUser, (link) => link.project)
  join_user: 'LinkProjectToUser'[];
}
