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
export default class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  position: string;

  @Column({ nullable: true })
  timezone: string;

  @Column('jsonb', { nullable: false, default: {} })
  config: {
    currentProject: object;
  };

  @OneToMany(() => LinkProjectToUser, (link) => link.user)
  join_project: 'LinkProjectToUser'[];

  preventSendSms: boolean;
}
