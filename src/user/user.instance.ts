import * as nestjs from '@nestjs/common';
import { UserService, UserServiceSingleton } from './user.service';
import { SessionService, SessionServiceSingleton } from './../session/session.service';
import { ProjectInstance, ProjectInstanceSingleton } from '../project/project.instance';
import { EventsGateway } from '../events/events.gateway';
import { userGetOneAnswerDTO } from './user.dto';

@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class UserInstanceSingleton {
  id: number;
  data: userGetOneAnswerDTO;
  constructor(
    public userService: UserServiceSingleton,
    public sessionService: SessionServiceSingleton,
    @nestjs.Inject(nestjs.forwardRef(() => ProjectInstanceSingleton)) public projectInstance: ProjectInstanceSingleton,
    public events: EventsGateway,
  ) {}
  /**
   * @throws `User ID is empty`
   * @throws `User (id=${userId}) not exist`
   */
  async init(userId: number) {
    if (!userId) throw new nestjs.BadRequestException('User ID is empty');
    this.id = userId;
    this.data = await this.userService.getOne({ id: userId }, { includeSessions: true });
    if (!this.data) throw new nestjs.BadRequestException(`User (id=${userId}) not exist`);
    return this;
  }
  getProjectLink(projectId: number) {
    return this.data.projectList.find((link) => link.projectId === projectId);
  }
  hasContact(contactId: number) {
    return this.data.contactList.find((contact) => contact.userId === contactId);
  }
  async timeIsFree(startTime: string, endTime: string) {
    return await this.userService.checkFreeTime(this.id, startTime, endTime);
  }
  async getForeignPersonalProjectList() {
    const foreignProjectList = await this.userService.getForeignPersonalProjectList(this.id);
    return foreignProjectList.map((project: { id: number }) => project.id);
  }
  async switchProject(currentSessionId, { switchToProjectId, switchFromProjectId }) {
    const switchToProjectLink = this.getProjectLink(switchToProjectId);

    await this.userService.update(this.id, { config: { currentProjectId: switchToProjectId } });
    const sessionIdList = currentSessionId ? [currentSessionId] : Object.keys(this.data.sessions);
    for (const sessionId of sessionIdList) {
      const sessionData = await this.sessionService.get(sessionId);
      if (sessionData.currentProjectId === switchFromProjectId) {
        await this.sessionService.update(sessionId, { currentProjectId: switchToProjectId });

        if (sessionData.eventsId) {
          const ws = this.events.server.of('/').sockets.get(sessionData.eventsId);
          if (ws) ws.emit('switchProject', JSON.stringify(switchToProjectLink));
        }
      }
    }

    if (currentSessionId) return switchToProjectLink;
  }
}

@nestjs.Injectable({ scope: nestjs.Scope.REQUEST })
export class UserInstance extends UserInstanceSingleton {
  constructor(
    public userService: UserService,
    public sessionService: SessionService,
    @nestjs.Inject(nestjs.forwardRef(() => ProjectInstance)) public projectInstance: ProjectInstance,
    public events: EventsGateway,
  ) {
    super(userService, sessionService, projectInstance, events);
  }
}
