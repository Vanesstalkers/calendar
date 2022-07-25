import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import User from '../entity/user';
import Project from '../entity/project';
import LinkProjectToUser from '../entity/project_to_user';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private repository: Repository<User>,
    @InjectRepository(Project) private projectRepository: Repository<Project>,
    @InjectRepository(LinkProjectToUser)
    private joinToProjectRepository: Repository<LinkProjectToUser>,
    private dataSource: DataSource,
  ) {}

  async getOne(where: { id?: number; phone?: string }): Promise<User> {
    const findData = await this.repository.findOne({
      where: { id: where.id, phone: where.phone },
      relations: ['join_project', 'join_project.project'],
    });
    return findData;
  }

  async create(data: User): Promise<{ user: User; project: Project }> {
    var project, user, join;
    await this.dataSource.manager.transaction(async (manager) => {
      const repository = manager.withRepository(this.repository);
      const projectRepository = manager.withRepository(this.projectRepository);
      const joinToProjectRepository = manager.withRepository(
        this.joinToProjectRepository,
      );

      project = new Project();
      project.title = data.name + '`s personal project';
      await projectRepository.save(project);

      user = new User();
      user.name = data.name;
      user.phone = data.phone;
      user.config = {
        currentProject: {
          id: project.id,
          title: project.title,
        },
      };
      await repository.save(user);

      join = new LinkProjectToUser();
      join.user = user;
      join.project = project;
      join.role = 'owner';
      await joinToProjectRepository.save(join);
    });

    // const user = await this.dataSource
    //   .createQueryBuilder()
    //   .insert()
    //   .into(User)
    //   .values([{ phone: data.phone, name: data.name }])
    //   .returning('id')
    //   .execute();
    // const project = await this.dataSource
    //   .createQueryBuilder()
    //   .insert()
    //   .into(Project)
    //   .values([
    //     { user_id: user.raw[0].id, name: data.name + '`s main project' },
    //   ])
    //   .returning('id')
    //   .execute();
    // console.log({ user_id: user.raw[0].id, project_id: project.raw[0].id });

    // const user = await this.dataSource
    //   .createQueryRunner()
    //   .query(
    //     `INSERT INTO "user" ("phone", "name") VALUES($1, $2) RETURNING id`,
    //     [data.phone, data.name],
    //   )
    //   .catch((err) => {
    //     console.log({ err });
    //     throw err;
    //   });
    // const project = await this.dataSource
    //   .createQueryRunner()
    //   .query(
    //     `INSERT INTO project (user_id, name) values ($1, $2) RETURNING id`,
    //     [user[0].id, data.name + '`s main project'],
    //   )
    //   .catch((err) => {
    //     console.log({ err });
    //     throw err;
    //   });
    // console.log({ user, project });

    return { user, project };
  }
}
