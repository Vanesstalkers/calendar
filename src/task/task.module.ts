import * as nestjs from '@nestjs/common';

import { ProjectController } from '../project/project.controller';
import { UserController } from '../user/user.controller';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

@nestjs.Module({
  imports: [],
  controllers: [TaskController],
  providers: [TaskService, UserController, ProjectController],
  exports: [TaskService],
})
export class TaskModule {}
