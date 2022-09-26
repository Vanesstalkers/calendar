import * as nestjs from '@nestjs/common';

import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { ProjectInstance } from './project.instance';
import { ProjectTransferService } from './transfer.service';
import { UserController } from '../user/user.controller';

@nestjs.Module({
  imports: [],
  controllers: [ProjectController],
  providers: [ProjectInstance, ProjectService, ProjectTransferService, UserController],
  exports: [ProjectInstance, ProjectService, ProjectTransferService],
})
export class ProjectModule {}
