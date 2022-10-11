import { InjectOptions, InjectPayload } from 'light-my-request';
import {
  authQueryUserDataI,
  payloadArrItemI,
  projectCreateBuildParamsI,
  updateQueryIconFileI,
  updateQueryUserDataI,
  userAuthBuildParamsI,
  userCodeBuildParamsI,
  userSearchBuildParamsI,
  userUpdateBuildParamsI,
} from './interfaces';
import { phones } from './constants.json';
import { title } from 'process';

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
  link = null,
  isIconFile = false,
  isIconFileNull = false,
  withFormdata = false,
}: userUpdateBuildParamsI) {
  const userData: updateQueryUserDataI = {
    name,
    timezone,
    config: {
      phoneCode,
      fake: true,
    },
  };
  if (phone) userData.phone = phone;
  const iconFile: updateQueryIconFileI | null = {};
  if (fileContent !== null) iconFile.fileContent = fileContent;
  if (link !== null) iconFile.link = link;
  if (fileMimetype !== null) iconFile.fileMimetype = fileMimetype;
  if (fileName !== null) iconFile.fileName = fileName;
  if (fileExtension !== null) iconFile.fileExtension = fileExtension;
  const payloadData = new Array<any>();
  payloadData.push(['userData', userData]);
  if (isIconFile) payloadData.push(['iconFile', iconFile]);
  if (isIconFileNull) payloadData.push(['iconFile', null]);
  if (userId !== null) payloadData.push(['userId', userId]);
  const payload: InjectPayload = Object.fromEntries(payloadData);
  const query: InjectOptions = {
    method: 'POST',
    url: withFormdata ? '/user/updateWithFormdata' : '/user/update',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    payload,
  };
  if (cookie) query.headers.cookie = cookie;
  return query;
}

export function getProjectCreateQuery({
  title = 'project title',
  userList = [],
  userId = 0,
  role = 'owner',
  userName = 'u2p user name',
  position = 'u2p position',
  config = {},
  cookie,
}: projectCreateBuildParamsI) {
  let userListCreated;
  const userListLength = userList.length;
  if (!userListLength) {
    const userListItem = [];
    if (userId !== null) userListItem.push(['userId', userId]);
    if (role !== null) userListItem.push(['role', role]);
    if (userName !== null) userListItem.push(['userName', userName]);
    if (position !== null) userListItem.push(['position', position]);
    if (config !== null) userListItem.push(['config', config]);
    userListCreated = [Object.fromEntries(userListItem)];
  }
  const payloadArr = [['userList', userListLength ? userList : userListCreated]];
  if (title !== null) payloadArr.push(['title', title]);
  const payload: InjectPayload = Object.fromEntries(payloadArr);
  const query: InjectOptions = {
    method: 'POST',
    url: '/project/create',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    payload,
  };
  if (cookie) query.headers.cookie = cookie;
  return query;
}

export function getProjectGetOneQuery({ cookie, projectId }: { cookie?: string; projectId?: string }) {
  const query: InjectOptions = {
    method: 'GET',
    url: '/project/getOne',
    query: { projectId },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
  };
  if (!projectId) delete query.query;
  if (cookie) query.headers.cookie = cookie;
  return query;
}
