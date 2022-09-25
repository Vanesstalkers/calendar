import * as nestjs from '@nestjs/common';
import { QueryTypes } from 'sequelize';
import { Transaction } from 'sequelize/types';

import { ProjectService } from './project.service';
import { UtilsService } from '../utils/utils.service';

@nestjs.Injectable()
export class ProjectTransferService {
  constructor(private utils: UtilsService, private projectService: ProjectService) {}

  async execute({ projectId, toUserLink, fromUserLink }, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
      await this.projectService.updateUserLink(fromUserLink.id, { deleteTime: new Date() }, transaction);
      await this.projectService.updateUserLink(toUserLink.id, { role: 'owner' }, transaction);

      await this.utils.queryDB(
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
      );
    });
  }
}
