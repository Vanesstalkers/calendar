import { InjectOptions, InjectPayload } from 'light-my-request';
import {
  authQueryUserDataI,
  payloadArrItemI,
  updateQueryIconFileI,
  updateQueryUserDataI,
  userAuthBuildParamsI,
  userCodeBuildParamsI,
  userSearchBuildParamsI,
  userUpdateBuildParamsI,
} from './interfaces';
import { phones } from './constants.json';

// injection query builders per route
export function getUserAuthQuery({
  disableTimeout = true,
  preventSendSms = true,
  phone = phones[0],
  cookie = null,
  name = 'Test_User1',
  timezone = 'Europe/Saratov',
  phoneCode = '7',
}: userAuthBuildParamsI) {
  const userData: authQueryUserDataI = {
    name,
    timezone,
    config: {
      phoneCode,
      fake: true,
    },
  };
  if (phone) userData.phone = phone;
  const payload: InjectPayload = {
    userData,
    preventSendSms,
    disableTimeout,
  };
  const query: InjectOptions = {
    method: 'POST',
    url: '/user/auth',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    payload,
  };
  if (cookie) query.headers.cookie = cookie;
  return query;
}

export function getUserCodeQuery({ code, cookie }: userCodeBuildParamsI) {
  const payload: InjectPayload = code ? { code } : {};
  const query: InjectOptions = {
    method: 'POST',
    url: '/user/code',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    payload,
  };
  if (cookie) query.headers.cookie = cookie;
  return query;
}

export function getUserSessionQuery({ cookie }: { cookie?: string }) {
  const query: InjectOptions = {
    method: 'GET',
    url: '/user/session',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
  };
  if (cookie) query.headers.cookie = cookie;
  return query;
}

export function getUserLogoutQuery({ cookie }: { cookie?: string }) {
  const query: InjectOptions = {
    method: 'POST',
    url: '/user/logout',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    payload: {},
  };
  if (cookie) query.headers.cookie = cookie;
  return query;
}

export function getUserGetOneQuery({ cookie, userId }: { cookie?: string; userId?: string }) {
  const query: InjectOptions = {
    method: 'GET',
    url: '/user/getOne',
    query: { userId },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
  };
  if (!userId) delete query.query;
  if (cookie) query.headers.cookie = cookie;
  return query;
}

export function getUserSearchQuery({
  queryStr = '',
  globalSearch = true,
  limit = 50,
  offset = 0,
  cookie,
}: userSearchBuildParamsI) {
  const payloadData = new Array<any>();
  if (queryStr !== null) payloadData.push(['query', queryStr]);
  if (globalSearch !== null) payloadData.push(['globalSearch', globalSearch]);
  if (limit !== null) payloadData.push(['limit', limit]);
  if (offset !== null) payloadData.push(['offset', offset]);
  const payload: InjectPayload = Object.fromEntries(payloadData);
  const query: InjectOptions = {
    method: 'POST',
    url: '/user/search',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    payload,
  };
  if (cookie) query.headers.cookie = cookie;
  return query;
}

export function getUserChangeCurrentProjectQuery({ cookie, projectId }: { cookie?: string; projectId?: string }) {
  const query: InjectOptions = {
    method: 'POST',
    url: '/user/changeCurrentProject',
    query: { projectId },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    payload: {},
  };
  if (!projectId) delete query.query;
  if (cookie) query.headers.cookie = cookie;
  return query;
}

export function getUserUpdateQuery({
  userId = null,
  phone = null,
  cookie = null,
  name = 'Test_User1',
  timezone = 'Europe/Saratov',
  phoneCode = '7',
  fileContent = null,
  fileMimetype = null,
  fileName = null,
  fileExtension = null,
  isIconFile = false,
}: userUpdateBuildParamsI) {
  const userData: updateQueryUserDataI = {
    name,
    timezone,
    config: {
      phoneCode,
      fake: true,
    },
  };
  const iconFile: updateQueryIconFileI = {
    fileContent,
    fileMimetype,
    fileName,
    fileExtension,
  };
  if (phone) userData.phone = phone;
  const payloadData = new Array<any>();
  payloadData.push(['userData', userData]);
  if (isIconFile) payloadData.push(['iconFile', iconFile]);
  if (userId !== null) payloadData.push(['userId', userId]);
  const payload: InjectPayload = Object.fromEntries(payloadData);
  const query: InjectOptions = {
    method: 'POST',
    url: '/user/update',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    payload,
  };
  if (cookie) query.headers.cookie = cookie;
  return query;
}
