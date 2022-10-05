import * as nestjs from '@nestjs/common';
import { UserService, UserServiceSingleton } from './user.service';
import { SessionService, SessionServiceSingleton } from './../session/session.service';
import { userGetOneAnswerDTO } from './user.dto';

@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class UserInstanceSingleton {
  id: number;
  data: userGetOneAnswerDTO;
  constructor(public userService: UserServiceSingleton, public sessionService: SessionServiceSingleton) {}
  /**
   * @throws `User ID is empty`
   * @throws `User (id=${userId}) not exist`
   */
  async init(userId: number) {
    if (!userId) throw new nestjs.BadRequestException('User ID is empty');
    this.id = userId;
    this.data = await this.userService.getOne({ id: userId });
    if (!this.data) throw new nestjs.BadRequestException(`User (id=${userId}) not exist`);
    return this;
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
  async switchToPersonalProject() {
    const redirectProjectId = this.data.config.personalProjectId;
    await this.userService.update(this.id, { config: { currentProjectId: redirectProjectId } });
    await this.sessionService.updateStorageById(this.data.config.sessionStorageId, {
      currentProjectId: redirectProjectId,
    });
  }
}

@nestjs.Injectable({ scope: nestjs.Scope.REQUEST })
export class UserInstance extends UserInstanceSingleton {
  constructor(public userService: UserService, public sessionService: SessionService) {
    super(userService, sessionService);
  }
}
