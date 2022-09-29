import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { prepareApp } from './helpers/prepareApp';
import { InjectOptions } from 'light-my-request';
import { getUserAuthQuery, getUserCodeQuery } from './helpers/queryBuilders';
import { phones } from './helpers/constants.json';

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

  it('/user/auth (POST) missing phone', async () => {
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

  // TODO
  // тесты с вызовом user/getOne, по результатам которого и определяется,
  // уйдет ветка в регистрацию или в логин
  // проверка создан ли проект и u2p
  it('/user/code (POST) ok registration', async () => {
    const query1: InjectOptions = getUserAuthQuery({ phone: phones[1] });
    const result1 = await app.inject(query1);
    const cookie = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(200);
    expect(payload2.status).toEqual('ok');
  });

  it('/user/code (POST) ok login', async () => {
    // registration
    const query1: InjectOptions = getUserAuthQuery({ phone: phones[2] });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    const result2 = await app.inject(query2);
    // login
    const query3: InjectOptions = getUserAuthQuery({ phone: phones[2] });
    const result3 = await app.inject(query3);
    const cookie2 = result3.headers['set-cookie'].toString();
    const payload3 = JSON.parse(result3.payload);
    const query4: InjectOptions = getUserCodeQuery({ code: payload3.data.code, cookie: cookie2 });
    const result4 = await app.inject(query4);

    const payload2 = JSON.parse(result4.payload);
    expect(result2.statusCode).toEqual(200);
    expect(payload2.status).toEqual('ok');
  });

  it('/user/code (POST) wrong auth code 1', async () => {
    const query1: InjectOptions = getUserAuthQuery({});
    const result1 = await app.inject(query1);
    const cookie = result1.headers['set-cookie'].toString();
    const query2: InjectOptions = getUserCodeQuery({ code: 'qqqq', cookie });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(403);
    expect(payload2.status).toEqual('err');
    expect(payload2.code).toEqual('WRONG_AUTH_CODE');
    expect(payload2.msg).toEqual('Wrong auth code');
    expect(payload2.path).toEqual('/user/code');
    expect(payload2.timestamp).toBeDefined();
  });

  it('/user/code (POST) wrong auth code 2', async () => {
    const query1: InjectOptions = getUserAuthQuery({});
    const result1 = await app.inject(query1);
    const cookie = result1.headers['set-cookie'].toString();
    const query2: InjectOptions = getUserCodeQuery({ code: '@@@@', cookie });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(403);
    expect(payload2.status).toEqual('err');
    expect(payload2.code).toEqual('WRONG_AUTH_CODE');
    expect(payload2.msg).toEqual('Wrong auth code');
    expect(payload2.path).toEqual('/user/code');
    expect(payload2.timestamp).toBeDefined();
  });

  it('/user/code (POST) wrong auth code 3', async () => {
    const query1: InjectOptions = getUserAuthQuery({});
    const result1 = await app.inject(query1);
    const cookie = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    const exmpleCode1 = '1111';
    const exmpleCode2 = '1112';
    const code = payload1.data.code === exmpleCode1 ? exmpleCode2 : exmpleCode1;
    const query2: InjectOptions = getUserCodeQuery({ code, cookie });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(403);
    expect(payload2.status).toEqual('err');
    expect(payload2.code).toEqual('WRONG_AUTH_CODE');
    expect(payload2.msg).toEqual('Wrong auth code');
    expect(payload2.path).toEqual('/user/code');
    expect(payload2.timestamp).toBeDefined();
  });

  it('/user/code (POST) missing code', async () => {
    const query1: InjectOptions = getUserAuthQuery({});
    const result1 = await app.inject(query1);
    const cookie = result1.headers['set-cookie'].toString();
    const query2: InjectOptions = getUserCodeQuery({ cookie });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(400);
    expect(payload2.status).toEqual('err');
    expect(payload2.msg).toEqual('Auth code is empty');
    expect(payload2.path).toEqual('/user/code');
    expect(payload2.timestamp).toBeDefined();
  });

  it('/user/code (POST) missing cookie', async () => {
    const query1: InjectOptions = getUserAuthQuery({});
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(403);
    expect(payload2.status).toEqual('err');
    expect(payload2.code).toEqual('WRONG_AUTH_CODE');
    expect(payload2.msg).toEqual('Wrong auth code');
    expect(payload2.path).toEqual('/user/code');
    expect(payload2.timestamp).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });
});
