import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { prepareApp } from './prepareApp';
import { InjectOptions, InjectPayload } from 'light-my-request';
import { authQueryUserDataI, userAuthQueryParamsI } from './interfaces';

// helper
function getUserAuthQuery({
  disableTimeout = true,
  preventSendSms = true,
  phone = '1234567890',
  cookie = undefined,
}: userAuthQueryParamsI) {
  const userData: authQueryUserDataI = {
    name: 'Николай',
    timezone: 'Europe/Saratov',
    config: {
      phoneCode: '7',
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

describe('UserController (e2e)', () => {
  let app: NestFastifyApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await prepareApp(moduleFixture);
  });

  it('/user/auth (POST) ok', async () => {
    const query: InjectOptions = getUserAuthQuery({});
    const result = await app.inject(query);
    expect(result.statusCode).toEqual(200);
    expect(result.payload).toContain('{"status":"ok","msg":"wait for auth code","data":{"code":"');
    const payload = JSON.parse(result.payload);
    const code = payload?.data?.code;
    expect(code.length).toEqual(4);
    expect(parseInt(code)).not.toBeNaN();
  });

  it('/user/auth (POST) bad phone 1', async () => {
    const query: InjectOptions = getUserAuthQuery({ phone: '123456789' });
    const result = await app.inject(query);
    expect(result.statusCode).toEqual(400);
    const payload = JSON.parse(result.payload);
    expect(payload.status).toEqual('err');
    expect(payload.code).toEqual('BAD_PHONE_NUMBER');
    expect(payload.msg).toEqual('Phone number is incorrect');
    expect(payload.path).toEqual('/user/auth');
    expect(payload.timestamp).toBeDefined();
  });

  it('/user/auth (POST) bad phone 2', async () => {
    const query: InjectOptions = getUserAuthQuery({ phone: '123456789a' });
    const result = await app.inject(query);
    expect(result.statusCode).toEqual(400);
    const payload = JSON.parse(result.payload);
    expect(payload.status).toEqual('err');
    expect(payload.code).toEqual('BAD_PHONE_NUMBER');
    expect(payload.msg).toEqual('Phone number is incorrect');
    expect(payload.path).toEqual('/user/auth');
    expect(payload.timestamp).toBeDefined();
  });

  it('/user/auth (POST) bad phone 3', async () => {
    const query: InjectOptions = getUserAuthQuery({ phone: '123456789@' });
    const result = await app.inject(query);
    expect(result.statusCode).toEqual(400);
    const payload = JSON.parse(result.payload);
    expect(payload.status).toEqual('err');
    expect(payload.code).toEqual('BAD_PHONE_NUMBER');
    expect(payload.msg).toEqual('Phone number is incorrect');
    expect(payload.path).toEqual('/user/auth');
    expect(payload.timestamp).toBeDefined();
  });

  it('/user/auth (POST) no phone', async () => {
    const query: InjectOptions = getUserAuthQuery({ phone: null });
    const result = await app.inject(query);
    expect(result.statusCode).toEqual(400);
    const payload = JSON.parse(result.payload);
    expect(payload.status).toEqual('err');
    expect(payload.code).toEqual('BAD_PHONE_NUMBER');
    expect(payload.msg).toEqual('Phone number is incorrect');
    expect(payload.path).toEqual('/user/auth');
    expect(payload.timestamp).toBeDefined();
  });

  it('/user/auth (POST) auth timeout', async () => {
    const query1: InjectOptions = getUserAuthQuery({ disableTimeout: false });
    const result1 = await app.inject(query1);
    const cookie = result1.headers['set-cookie'].toString();
    const query2: InjectOptions = getUserAuthQuery({ disableTimeout: false, cookie });
    const result2 = await app.inject(query2);
    const payload = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(400);
    expect(payload.status).toEqual('err');
    expect(payload.code).toEqual('AUTH_TIMEOUT');
    expect(payload.msg.match(/Wait \d\d seconds before next attempt./gm)).not.toEqual(null);
    expect(payload.path).toEqual('/user/auth');
    expect(payload.timestamp).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });
});
