import * as nestjs from '@nestjs/common';

import { ProjectController } from './project.controller';
import { ProjectService, ProjectServiceSingleton } from './project.service';
import { ProjectInstance, ProjectInstanceSingleton } from './project.instance';
import { UserController } from '../user/user.controller';

@nestjs.Module({
  imports: [],
  controllers: [ProjectController],
  providers: [ProjectInstance, ProjectService, ProjectInstanceSingleton, ProjectServiceSingleton, UserController],
  exports: [ProjectInstance, ProjectService, ProjectInstanceSingleton, ProjectServiceSingleton],
})
export class ProjectModule {}
