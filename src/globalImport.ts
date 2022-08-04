import {
  exceptonAnswerI,
  emptyAnswerI,
  successAnswerI,
  searchAnswerI,
  createdAnswerI,
} from './common/interfaces/httpAnswer';

import {
  validateSession,
  isLoggedIn,
} from './common/decorators/access.decorators';
import { Multipart } from './common/decorators/multipart.decorators';

import { dbErrorCatcher } from './common/filters/exception.filter';
import { PostStatusInterceptor } from './common/interceptors/request.interceptor';

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

import { SessionStorageI } from './session/interfaces/storage.interface';

export const httpAnswer = {
  OK: { status: 'ok' },
  ERR: { status: 'err' },
};

export const interfaces = {
  session: {
    storage: SessionStorageI,
  },
  response: {
    exception: exceptonAnswerI,
    empty: emptyAnswerI,
    success: successAnswerI,
    search: searchAnswerI,
    created: createdAnswerI,
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
  Multipart,
};

export const exception = {
  dbErrorCatcher,
};

export const interceptors = {
  PostStatusInterceptor,
};

export type types = {
  decorators: {
    validateSession: validateSession;
    isLoggedIn: isLoggedIn;
  };
  interfaces: {
    response: {
      exception: exceptonAnswerI;
      empty: emptyAnswerI;
      success: successAnswerI;
      created: createdAnswerI;
    };
  };
  models: {
    user: User | { id?: number; phone?: string; config?: any };
    project: Project | { id?: number; title?: string; __projecttouser?: any[] };
    task: Task;
    project2user: ProjectToUser | { id?: number; personal?: boolean };
    taskgroup: TaskGroup;
    hashtag: Hashtag;
    task2user: TaskToUser | { id?: number; role?: string; status?: string };
    user2user: UserToUser;
    tick: Tick;
    comment: Comment;
    file: File;
  };
};
