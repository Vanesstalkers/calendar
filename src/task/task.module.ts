import * as nestjs from '@nestjs/common';

import { ProjectController } from '../project/project.controller';
import { UserController } from '../user/user.controller';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { TaskInstance } from './task.instance';

@nestjs.Module({
  imports: [],
  controllers: [TaskController],
  providers: [TaskInstance, TaskService, UserController, ProjectController],
  exports: [TaskInstance, TaskService],
})
export class TaskModule {}
