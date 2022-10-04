import { InjectOptions, InjectPayload } from 'light-my-request';
import { authQueryUserDataI, userAuthBuildParamsI, userCodeBuildParamsI, userSearchBuildParamsI } from './interfaces';
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
  queryStr = 'Test_User1',
  globalSearch = true,
  limit = 50,
  offset = 0,
  cookie,
}: userSearchBuildParamsI) {
  let payload: InjectPayload;
  if (queryStr === null) {
    payload = {
      globalSearch,
      limit,
      offset,
    };
  } else if (globalSearch === null) {
    payload = {
      query: queryStr,
      limit,
      offset,
    };
  } else if (limit === null) {
    payload = {
      query: queryStr,
      globalSearch,
      offset,
    };
  } else if (offset === null) {
    payload = {
      query: queryStr,
      globalSearch,
      limit,
    };
  } else {
    payload = {
      query: queryStr,
      globalSearch,
      limit,
      offset,
    };
  }
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
