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

import User from './user';
import Project from './project';

@Entity('project_to_user')
export default class LinkProjectToUser {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'text', nullable: true })
  role: string;

  @ManyToOne(() => User, (user) => user.join_project)
  user: User;

  @ManyToOne(() => Project, (project) => project.join_user)
  project: Project;
}
