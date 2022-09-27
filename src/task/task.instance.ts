import * as nestjs from '@nestjs/common';
import { TaskService } from './task.service';
import { ProjectInstance } from '../project/project.instance';
import { UserInstance } from '../user/user.instance';
import { taskGetOneAnswerDTO, taskUserLinkFullDTO, taskFullDTO, taskUpdateDTO } from './task.dto';

@nestjs.Injectable()
export class TaskInstance {
  id: number;
  data: taskGetOneAnswerDTO | taskFullDTO;
  project: ProjectInstance;
  consumer: UserInstance;
  constructor(
    public taskService: TaskService,
    public projectInstance: ProjectInstance,
    public userInstance: UserInstance,
  ) {}
  isOwner(userId: number) {
    return userId === this.data.ownUser.userId;
  }
  isMember(userId: number) {
    return this.data.userList.find((userLink) => userLink.userId === userId) ? true : false;
  }
  getStatus() {
    let status = 'ready';
    if (this.data.userList.find((user) => user.role === 'control' && !user.status)) status = 'on_control';
    if (!this.data.execEndTime) status = 'in_work';
    if (this.data.userList.find((user) => user.role === 'exec' && !user.status)) status = 'not_in_work';
    return status;
  }
  needPostcontrol() {
    const taskExecutors = this.data.userList.filter((link: taskUserLinkFullDTO) => link.role === 'exec');
    const taskHasSingleExecutor = taskExecutors.length === 1;
    const taskExecutorsDiffersFromOwner = !taskExecutors.find(
      (link: taskUserLinkFullDTO) => link.userId === this.data.ownUser.userId,
    );
    return taskHasSingleExecutor && taskExecutorsDiffersFromOwner;
  }
  /**
   * @fires {@link ProjectInstance.init}
   * @throws `Task ID is empty`
   * @throws `Task (id=${this.id}) not exist`
   * @throws `Task (id=${this.id}) is deleted`
   * @throws `Access denied for user (id=${consumerId}) to task (id=${this.id})`
   * @throws `Task (id=${this.id}) not found for user (id=${consumerId})`
   * @throws `User (id=${consumerId}) is not owner of task (id=${this.id})`
   */
  async init(
    taskId: number,
    {
      consumerId = null,
      canBeDeleted = false,
      allowMemberOnly = false,
      allowOwnerOnly = false,
    }: { consumerId?: number; canBeDeleted?: boolean; allowMemberOnly?: boolean; allowOwnerOnly?: boolean },
  ) {
    if (!taskId) throw new nestjs.BadRequestException('Task ID is empty');
    this.id = taskId;
    this.data = await this.taskService.getOne({ id: taskId }, { canBeDeleted: true });
    if (!this.data) throw new nestjs.BadRequestException(`Task (id=${this.id}) not exist`);
    if (this.data.deleteTime && !canBeDeleted)
      throw new nestjs.BadRequestException({ code: 'OBJECT_DELETED', msg: `Task (id=${this.id}) is deleted` });
    if (!this.data.userList) this.data.userList = [];

    this.project = await this.projectInstance.init(this.data.projectId, consumerId);
    if (consumerId) {
      if (
        !this.isMember(consumerId) &&
        !this.isOwner(consumerId) &&
        (this.project.isPersonal() || !this.project.isMember(consumerId))
      ) {
        throw new nestjs.BadRequestException(`Access denied for user (id=${consumerId}) to task (id=${this.id})`);
      }
      if (allowMemberOnly && !this.isMember(consumerId)) {
        throw new nestjs.BadRequestException(`Task (id=${this.id}) not found for user (id=${consumerId})`);
      }
      if (allowOwnerOnly && !this.isOwner(consumerId)) {
        throw new nestjs.BadRequestException(`User (id=${consumerId}) is not owner of task (id=${this.id})`);
      }
      this.consumer = await this.userInstance.init(consumerId);
    }

    return this;
  }
  /**
   * @fires {@link TaskInstance.validateDataForUpdate}
   * @throws `User list is empty`
   */
  async validateDataForCreate(taskData: taskFullDTO, consumerId: number) {
    if (!taskData.userList?.length) throw new nestjs.BadRequestException('User list is empty');
    if (consumerId) this.consumer = await this.userInstance.init(consumerId);
    this.project = await this.projectInstance.init(taskData.projectId, consumerId);
    await this.validateDataForUpdate(taskData);
  }
  /**
   * @throws `Task param "${param}" must be in the future tense.`
   * @throws `Regular task must have "endTime" param.`
   * @throws `User (id=${this.consumer.id}) is not owner of personal project (id=${this.project.id})`
   * @throws `User (id=${checkUserId}) is not member of project (id=${this.project.id})`
   * @throws `User (id=${this.consumer.id}) is not in user (id=${checkUserId}) contact list.`
   * @throws `Time from "${startTime}" to "${endTime}" for user (id=${checkUser.id}) is busy.`
   */
  async validateDataForUpdate(data: taskUpdateDTO) {
    if (!data.userList) data.userList = [];

    const now = new Date();
    const timeParams = ['endTime', 'startTime', 'execEndTime'];
    for (const param of timeParams) {
      if (data[param] && new Date(data[param]) < now) {
        throw new nestjs.BadRequestException({
          code: 'BAD_TASK_DATE',
          msg: `Task param "${param}" must be in the future tense.`,
        });
      }
    }
    if (data.regular?.enabled && !(data.endTime || this.data?.endTime)) {
      throw new nestjs.BadRequestException({
        code: 'MISSING_REQUIRED_PARAM',
        msg: 'Regular task must have "endTime" param.',
      });
    }

    if (this.project.isPersonal() && !this.project.isOwner(this.consumer.id)) {
      throw new nestjs.BadRequestException(
        `User (id=${this.consumer.id}) is not owner of personal project (id=${this.project.id})`,
      );
    }

    for (const link of data.userList) {
      const checkUserId = link.userId;
      if (!this.project.isMember(checkUserId)) {
        throw new nestjs.BadRequestException(
          `User (id=${checkUserId}) is not member of project (id=${this.project.id})`,
        );
      }

      const checkUser = await this.userInstance.init(checkUserId);
      if (this.project.isPersonal() && this.consumer.id !== checkUserId && !checkUser.hasContact(this.consumer.id)) {
        throw new nestjs.BadRequestException({
          code: 'NOT_IN_CONTACT_LIST',
          msg: `User (id=${this.consumer.id}) is not in user (id=${checkUserId}) contact list.`,
        });
      }

      if (data.startTime !== undefined && data.endTime !== undefined) {
        const startTime = data.startTime;
        const endTime = data.endTime;
        const userTimeIsFree = await checkUser.timeIsFree(startTime, endTime);
        if (!userTimeIsFree) {
          throw new nestjs.BadRequestException({
            code: 'TIME_IS_BUSY',
            msg: `Time from "${startTime}" to "${endTime}" for user (id=${checkUser.id}) is busy.`,
          });
        }
      }

      // дефолтные значения для связи
      if (!link.role) link.role = 'exec';
      if (!link.status && checkUserId === data.ownUserId) link.status = 'exec_ready';
    }

    return this;
  }
}
