import * as nestjs from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { decorators, interfaces, models, types, exception, sql } from '../globalImport';

import { ProjectService } from './project.service';

@nestjs.Injectable()
export class ProjectTransferService {
  constructor(private sequelize: Sequelize, private projectService: ProjectService) {}

  async execute({ projectId, toUserLink, fromUserLink }) {
    const transaction = await this.sequelize.transaction();
    try {
      await this.projectService.updateUserLink(fromUserLink.id, { deleteTime: new Date() }, transaction);
      await this.projectService.updateUserLink(toUserLink.id, { role: 'owner' }, transaction);
      // await this.projectService.upsertLinkToUser(projectId, newOwnerUserId, { role: 'owner' }, transaction);

      await this.sequelize
        .query(
          `--sql
            UPDATE "task"
            SET "ownUserId" = :toUserId
            WHERE "ownUserId" = :fromUserId AND "projectId" = :projectId
        `,
          {
            replacements: { projectId, toUserId: toUserLink.userId, fromUserId: fromUserLink.userId },
            type: QueryTypes.UPDATE,
            transaction,
          },
        )
        .catch(exception.dbErrorCatcher);

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
    }
  }
}
