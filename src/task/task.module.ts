import * as nestjs from '@nestjs/common';

import { ProjectController } from '../project/project.controller';
import { UserController } from '../user/user.controller';
import { TaskController } from './task.controller';
import { TaskService, TaskServiceSingleton } from './task.service';
import { TaskInstance, TaskInstanceSingleton } from './task.instance';

@nestjs.Module({
  imports: [],
  controllers: [TaskController],
  providers: [TaskInstance, TaskService, TaskInstanceSingleton, TaskServiceSingleton, UserController, ProjectController],
  exports: [TaskInstance, TaskService, TaskInstanceSingleton, TaskServiceSingleton],
})
export class TaskModule {}
