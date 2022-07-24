import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import Project from '../entity/project';
import LinkProjectToUser from '../entity/project_to_user';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project) private repository: Repository<Project>,
    @InjectRepository(LinkProjectToUser)
    private joinToProjectRepository: Repository<LinkProjectToUser>,
    private dataSource: DataSource,
  ) {}

  async getOne(id: number): Promise<Project> {
    const findData = await this.repository.findOne({
      where: { id },
      relations: ['join_user', 'join_user.user'],
    });
    return findData;
  }
}
