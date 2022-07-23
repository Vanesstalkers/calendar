import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { User } from './user.entity';
import { Project } from '../project/project.entity';
import { AuthService } from '../auth/auth.service';
import { SessionService } from '../session/session.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private repository: Repository<User>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private dataSource: DataSource,
  ) {}

  async getData(): Promise<User[]> {
    const user = await this.repository.find();
    return user;
  }

  async create(data: User) {
    
    // const user = new User();
    // user.name = data.name;
    // user.phone = data.phone;
    // await this.repository.save(user);

    // const project = new Project();
    // project.name = 'Joe Smith';
    // await this.projectRepository.save(project);

    const user = await this.dataSource
      .createQueryRunner()
      .query(
        `INSERT INTO "user" ("phone", "name") VALUES($1, $2) RETURNING id`,
        [data.phone, data.name],
      )
      .catch((err) => {
        console.log({ err });
        throw err;
      });
    console.log({ user });
    const project = await this.dataSource
      .createQueryRunner()
      .query(
        `INSERT INTO project (user_id, name) values ($1, $2) RETURNING id`,
        [user[0].id, data.name + '`s main project'],
      )
      .catch((err) => {
        console.log({ err });
        throw err;
      });
    console.log({ project });

    return;
  }
}
