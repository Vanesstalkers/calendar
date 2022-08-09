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
import { notNull, Multipart } from './common/decorators/argument.decorators';

import { dbErrorCatcher, fsErrorCatcher } from './common/filters/exception.filter';
import { PostStatusInterceptor } from './common/interceptors/request.interceptor';

import * as userDTO from './user/user.dto';
import * as projectDTO from './project/project.dto';
import { Task } from './models/task';
import { ProjectToUser } from './models/project_to_user';
import { TaskGroup } from './models/task_group';
import { Hashtag } from './models/hashtag';
import { TaskToUser } from './models/task_to_user';
import * as tickDTO from './tick/tick.dto';
import * as commentDTO from './comment/comment.dto';
import * as fileDTO from './file/file.dto';

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
  user: userDTO.User,
  project: projectDTO.Project,
  task: Task,
  project2user: ProjectToUser,
  taskgroup: TaskGroup,
  hashtag: Hashtag,
  task2user: TaskToUser,
  user2user: userDTO.UserToUser,
  tick: tickDTO.Tick,
  comment: commentDTO.Comment,
  file: fileDTO.File,
};

export const decorators = {
  validateSession,
  isLoggedIn,
  Multipart,
  notNull,
};

export const exception = {
  dbErrorCatcher,
  fsErrorCatcher,
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
    user: userDTO.User | { id?: number; phone?: string; config?: any };
    project: projectDTO.Project | { id?: number; title?: string; __projecttouser?: any[] };
    task: Task;
    project2user: ProjectToUser | { id?: number; personal?: boolean };
    taskgroup: TaskGroup;
    hashtag: Hashtag;
    task2user: TaskToUser | { id?: number; role?: string; status?: string };
    user2user: userDTO.UserToUser;
    tick: tickDTO.Tick;
    comment: commentDTO.Comment;
    file: fileDTO.File;
  };
};
