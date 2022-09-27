import * as nestjs from '@nestjs/common';

import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { ProjectInstance } from './project.instance';
import { UserController } from '../user/user.controller';

@nestjs.Module({
  imports: [],
  controllers: [ProjectController],
  providers: [ProjectInstance, ProjectService, UserController],
  exports: [ProjectInstance, ProjectService],
})
export class ProjectModule {}
