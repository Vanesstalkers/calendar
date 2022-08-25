import {
  exceptonAnswerI,
  emptyAnswerI,
  successAnswerI,
  searchAnswerI,
  createdAnswerI,
} from './common/interfaces/httpAnswer';

import { validateSession, isLoggedIn } from './common/decorators/access.decorators';
import { notNull, Multipart } from './common/decorators/argument.decorators';

import { dbErrorCatcher, fsErrorCatcher } from './common/filters/exception.filter';
import { PostStatusInterceptor } from './common/interceptors/request.interceptor';

import * as userDTO from './user/user.dto';
import * as projectDTO from './project/project.dto';
import * as taskDTO from './task/task.dto';
import * as commentDTO from './comment/comment.dto';
import * as fileDTO from './file/file.dto';

import { sessionStorageDTO } from './session/session.dto';

import * as projectSQL from './project/project.sql';
import * as fileSQL from './file/file.sql';

export const sql = {
  project: projectSQL.query,
  file: fileSQL.query,
}

export const httpAnswer = {
  OK: { status: 'ok' },
  ERR: { status: 'err' },
};

export const interfaces = {
  session: {
    storage: sessionStorageDTO,
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
  task: taskDTO.Task,
  project2user: projectDTO.ProjectToUser,
  taskgroup: taskDTO.TaskGroup,
  hashtag: taskDTO.Hashtag,
  task2user: taskDTO.TaskToUser,
  user2user: userDTO.UserToUser,
  tick: taskDTO.Tick,
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
  getOneConfig: { checkExists?: boolean; include?: boolean; attributes?: string[] };
  session: {
    storage: sessionStorageDTO;
  };
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
    user: userDTO.User;
    project: projectDTO.Project | { id?: number; title?: string; __projecttouser?: any[] };
    task: taskDTO.Task;
    project2user: projectDTO.ProjectToUser | { id?: number; personal?: boolean };
    taskgroup: taskDTO.TaskGroup;
    hashtag: taskDTO.Hashtag;
    task2user: taskDTO.TaskToUser | { id?: number; role?: string; status?: string };
    user2user: userDTO.UserToUser;
    tick: taskDTO.Tick;
    comment: commentDTO.Comment;
    file: fileDTO.File;
  };
};
