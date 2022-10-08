import * as nestjs from '@nestjs/common';
import { ProjectService, ProjectServiceSingleton } from './project.service';
import { projectGetOneAnswerDTO, projectUpdateQueryDataDTO } from './project.dto';
import { UserInstance, UserInstanceSingleton } from '../user/user.instance';

@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class ProjectInstanceSingleton {
  id: number;
  data: projectGetOneAnswerDTO;
  consumer: UserInstanceSingleton;
  constructor(public projectService: ProjectServiceSingleton, public userInstance: UserInstanceSingleton) {}
  /**
   * @fires {@link UserInstanceSingleton.init}
   * @fires {@link ProjectInstanceSingleton.checkIsMember}
   * @throws `Project ID is empty`
   * @throws `Project (id=${projectId}) not exist`
   */
  async init(projectId: number, consumerId?: number) {
    if (!projectId) throw new nestjs.BadRequestException('Project ID is empty');
    this.id = projectId;
    this.data = await this.projectService.getOne({ id: projectId });
    if (!this.data) throw new nestjs.BadRequestException(`Project (id=${projectId}) not exist`);

    if (consumerId) {
      this.checkIsMember(consumerId);
      this.consumer = await this.userInstance.init(consumerId);
    }
    return this;
  }
  isPersonal() {
    return this.data.personal;
  }
  isMember(userId: number) {
    return this.data.userList.find((userLink) => userLink.userId === userId) ? true : false;
  }
  isOwner(userId: number) {
    return this.data.userList.find((userLink) => userLink.userId === userId && userLink.role === 'owner')
      ? true
      : false;
  }
  getUserLink(userId: number) {
    return this.data.userList.find((link) => link.userId === userId);
  }
  /**
   * @throws `User (id=${userId}) is not a member of project (id=${this.id})`
   */
  checkIsMember(userId: number) {
    if (!this.isMember(userId)) {
      throw new nestjs.BadRequestException(`User (id=${userId}) is not a member of project (id=${this.id})`);
    }
  }
  /**
   * @fires {@link ProjectInstance.checkIsMember}
   * @throws `User (id=${userId}) is not owner of personal project (id=${this.id}).`
   */
  checkPersonalAccess(userId: number) {
    this.checkIsMember(userId);
    if (this.isPersonal() && !this.isOwner(userId)) {
      throw new nestjs.BadRequestException(`User (id=${userId}) is not owner of personal project (id=${this.id}).`);
    }
  }
  /**
   * @throws `Access denied to change key ("${key}") of personal project (id=${this.id}).`
   */
  validateDataForUpdate(data: projectUpdateQueryDataDTO) {
    if (this.isPersonal()) {
      for (const key of Object.keys(data)) {
        if (['title', 'personal'].includes(key)) {
          throw new nestjs.BadRequestException(
            `Access denied to change key ("${key}") of personal project (id=${this.id}).`,
          );
        }
      }
    }
  }

  async fillGetTasksQuery(queryData, sessionData) {
    const projectIds = [this.id];
    if (this.id === sessionData.personalProjectId) {
      const foreignProjectListIds = await this.consumer.getForeignPersonalProjectList();
      projectIds.push(...foreignProjectListIds);
    }

    const sessionUserCurrentProjectLink = this.getUserLink(this.consumer.id);
    const scheduleFilters = sessionUserCurrentProjectLink.config?.scheduleFilters;

    return { ...queryData, projectIds, scheduleFilters };
  }
}

@nestjs.Injectable({ scope: nestjs.Scope.REQUEST })
export class ProjectInstance extends ProjectInstanceSingleton {
  consumer: UserInstance;
  constructor(public projectService: ProjectService, public userInstance: UserInstance) {
    super(projectService, userInstance);
  }
}
