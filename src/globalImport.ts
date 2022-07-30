import {
  exceptonAnswerDTO,
  emptyAnswerDTO,
  successAnswerDTO,
} from './dto/httpAnswer';

import { validateSession, isLoggedIn } from './decorators/test.decorator';

import { User } from './models/user';
import { Project } from './models/project';
import { Task } from './models/task';
import { ProjectToUser } from './models/project_to_user';
import { TaskGroup } from './models/task_group';
import { Hashtag } from './models/hashtag';
import { TaskToUser } from './models/task_to_user';
import { UserToUser } from './models/user_to_user';
import { Tick } from './models/tick';
import { Comment } from './models/comment';
import { File } from './models/file';

export const dto = {
  response: {
    exception: exceptonAnswerDTO,
    empty: emptyAnswerDTO,
    success: successAnswerDTO,
  },
};

export const models = {
  user: User,
  project: Project,
  task: Task,
  project2user: ProjectToUser,
  taskgroup: TaskGroup,
  hashtag: Hashtag,
  task2user: TaskToUser,
  user2user: UserToUser,
  tick: Tick,
  comment: Comment,
  file: File,
};

export const decorators = {
  validateSession,
  isLoggedIn,
};
export type types = {
  decorators: {
    validateSession: validateSession;
    isLoggedIn: isLoggedIn;
  };
  dto: {
    response: {
      empty: emptyAnswerDTO;
      success: successAnswerDTO;
    };
  };
  models: {
    user: User;
    project: Project;
    task: Task;
    project2user: ProjectToUser;
    taskgroup: TaskGroup;
    hashtag: Hashtag;
    task2user: TaskToUser;
    user2user: UserToUser;
    tick: Tick;
    comment: Comment;
    file: File;
  };
};
