import { InjectOptions, InjectPayload } from 'light-my-request';
import { authQueryUserDataI, userAuthBuildParamsI, userCodeBuildParamsI } from './interfaces';
import { phones } from './constants.json';

// injection query builders per route
export function getUserAuthQuery({
  disableTimeout = true,
  preventSendSms = true,
  phone = phones[0],
  cookie = null,
}: userAuthBuildParamsI) {
  const userData: authQueryUserDataI = {
    name: 'Николай',
    timezone: 'Europe/Saratov',
    config: {
      phoneCode: '7',
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
