import * as sequelize from 'sequelize-typescript';

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

import { sessionStorageDTO } from './session/session.dto';

import * as sqlHelpers from './sqlHelpers';

export const sql = sqlHelpers;

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
  getOneConfig: { canBeDeleted?: boolean; include?: boolean; attributes?: string[] };
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
};

// фейковый класс для иньекций в PostStatusInterceptor
@sequelize.Table({ tableName: 'logger' })
export class Logger extends sequelize.Model {}
