import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { prepareApp } from './../helpers/prepare';
import { InjectOptions } from 'light-my-request';
import { getUserAuthQuery } from './../helpers/queryBuilders';

describe('UserController /user/auth (e2e)', () => {
  let app: NestFastifyApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await prepareApp(moduleFixture);
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });

  it('/user/auth (POST) ok', async () => {
    const query: InjectOptions = getUserAuthQuery({});
    const result = await app.inject(query);
    const payload = JSON.parse(result.payload);
    const code = payload?.data?.code;
    const cookie = result.headers['set-cookie'].toString();
    expect(result.statusCode).toEqual(200);
    expect(result.payload).toContain('{"status":"ok","msg":"wait for auth code","data":{"code":"');
    expect(code.length).toEqual(4);
    expect(parseInt(code)).not.toBeNaN();
    expect(cookie).toContain('session=');
  });

  it('/user/auth (POST) bad phone 1', async () => {
    const query: InjectOptions = getUserAuthQuery({ phone: '123456789' });
    const result = await app.inject(query);
    const payload = JSON.parse(result.payload);
    expect(result.statusCode).toEqual(400);
    expect(payload.status).toEqual('err');
    expect(payload.code).toEqual('BAD_PHONE_NUMBER');
    expect(payload.msg).toEqual('Phone number is incorrect');
    expect(payload.path).toEqual('/user/auth');
    expect(payload.timestamp).toBeDefined();
  });

  it('/user/auth (POST) bad phone 2', async () => {
    const query: InjectOptions = getUserAuthQuery({ phone: '123456789a' });
    const result = await app.inject(query);
    const payload = JSON.parse(result.payload);
    expect(result.statusCode).toEqual(400);
    expect(payload.status).toEqual('err');
    expect(payload.code).toEqual('BAD_PHONE_NUMBER');
    expect(payload.msg).toEqual('Phone number is incorrect');
    expect(payload.path).toEqual('/user/auth');
    expect(payload.timestamp).toBeDefined();
  });

  it('/user/auth (POST) bad phone 3', async () => {
    const query: InjectOptions = getUserAuthQuery({ phone: '123456789@' });
    const result = await app.inject(query);
    const payload = JSON.parse(result.payload);
    expect(result.statusCode).toEqual(400);
    expect(payload.status).toEqual('err');
    expect(payload.code).toEqual('BAD_PHONE_NUMBER');
    expect(payload.msg).toEqual('Phone number is incorrect');
    expect(payload.path).toEqual('/user/auth');
    expect(payload.timestamp).toBeDefined();
  });

  it('/user/auth (POST) missing phone', async () => {
    const query: InjectOptions = getUserAuthQuery({ phone: null });
    const result = await app.inject(query);
    const payload = JSON.parse(result.payload);
    expect(result.statusCode).toEqual(400);
    expect(payload.status).toEqual('err');
    expect(payload.code).toEqual('BAD_PHONE_NUMBER');
    expect(payload.msg).toEqual('Phone number is incorrect');
    expect(payload.path).toEqual('/user/auth');
    expect(payload.timestamp).toBeDefined();
  });

  it('/user/auth (POST) auth timeout', async () => {
    const query1: InjectOptions = getUserAuthQuery({ disableTimeout: false });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const query2: InjectOptions = getUserAuthQuery({ disableTimeout: false, cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(400);
    expect(payload2.status).toEqual('err');
    expect(payload2.code).toEqual('AUTH_TIMEOUT');
    expect(payload2.msg.match(/Wait \d\d seconds before next attempt./gm)).not.toEqual(null);
    expect(payload2.path).toEqual('/user/auth');
    expect(payload2.timestamp).toBeDefined();
  });
});
