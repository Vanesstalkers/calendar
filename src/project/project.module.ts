import * as nestjs from '@nestjs/common';

import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { ProjectTransferService } from './transfer.service';
import { UserController } from '../user/user.controller';

@nestjs.Module({
  imports: [],
  controllers: [ProjectController],
  providers: [ProjectService, ProjectTransferService, UserController],
  exports: [ProjectService, ProjectTransferService],
})
export class ProjectModule {}
