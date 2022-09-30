import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { prepareApp } from './helpers/prepareApp';
import { InjectOptions } from 'light-my-request';
import { getUserAuthQuery, getUserCodeQuery, getUserLogoutQuery, getUserSessionQuery } from './helpers/queryBuilders';
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

  // TODO
  // тесты с вызовом user/getOne, по результатам которого и определяется,
  // уйдет ветка в регистрацию или в логин
  // проверка создан ли проект и u2p
  it('/user/code (POST) ok registration', async () => {
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: phones[1] });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(200);
    expect(payload2.status).toEqual('ok');
  });

  it('/user/code (POST) ok login', async () => {
    // registration -> logout -> login
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: phones[2] });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    await app.inject(query2);
    // step 3: logout
    const query3: InjectOptions = getUserLogoutQuery({ cookie: cookie1 });
    await app.inject(query3);
    // step 4: auth
    const query4: InjectOptions = getUserAuthQuery({ phone: phones[2] });
    const result4 = await app.inject(query4);
    const cookie4 = result4.headers['set-cookie'].toString();
    const payload4 = JSON.parse(result4.payload);
    // step 5: code
    const query5: InjectOptions = getUserCodeQuery({ code: payload4.data.code, cookie: cookie4 });
    const result5 = await app.inject(query5);
    const payload5 = JSON.parse(result5.payload);
    expect(result5.statusCode).toEqual(200);
    expect(payload5.status).toEqual('ok');
  });

  it('/user/code (POST) wrong auth code 1', async () => {
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({});
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: 'qqqq', cookie: cookie1 });
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
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({});
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    // step 1: code
    const query2: InjectOptions = getUserCodeQuery({ code: '@@@@', cookie: cookie1 });
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
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({});
    const result1 = await app.inject(query1);
    const cookie = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
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
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({});
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(400);
    expect(payload2.status).toEqual('err');
    expect(payload2.msg).toEqual('Auth code is empty');
    expect(payload2.path).toEqual('/user/code');
    expect(payload2.timestamp).toBeDefined();
  });

  it('/user/code (POST) missing cookie', async () => {
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({});
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
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

  it('/user/session (GET) ok login true registration true', async () => {
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: phones[3] });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    await app.inject(query2);
    // step 3: session
    const query3: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(200);
    expect(payload3.status).toEqual('ok');
    expect(payload3.data.userId).not.toBeNaN();
    expect(payload3.data.registration).toEqual(true);
    expect(payload3.data.login).toEqual(true);
    expect(payload3.data.personalProjectId).not.toBeNaN();
    expect(payload3.data.currentProjectId).not.toBeNaN();
  });

  it('/user/session (GET) ok login false registration false', async () => {
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: phones[4] });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(200);
    expect(payload2.status).toEqual('ok');
    expect(payload2.data.userId).toEqual(null);
    expect(payload2.data.registration).toEqual(false);
    expect(payload2.data.login).toEqual(false);
    expect(payload2.data.personalProjectId).toEqual(null);
    expect(payload2.data.currentProjectId).toEqual(null);
  });

  it('/user/session (GET) ok login false registration true', async () => {
    // registration -> logout -> session
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: phones[3] });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    await app.inject(query2);
    // step 3: logout
    const query3: InjectOptions = getUserLogoutQuery({ cookie: cookie1 });
    await app.inject(query3);
    // step 4: session
    const query4: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    expect(result4.statusCode).toEqual(200);
    expect(payload4.status).toEqual('ok');
    expect(payload4.data.userId).not.toBeNaN();
    expect(payload4.data.registration).toEqual(true);
    expect(payload4.data.login).toEqual(false);
    expect(payload4.data.personalProjectId).not.toBeNaN();
    expect(payload4.data.currentProjectId).not.toBeNaN();
  });

  it('/user/session (GET) ok missing cookie', async () => {
    // step 1: session
    const query1: InjectOptions = getUserSessionQuery({});
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(200);
    expect(payload1.status).toEqual('ok');
    expect(payload1.data.userId).toEqual(null);
    expect(payload1.data.registration).toEqual(false);
    expect(payload1.data.login).toEqual(false);
    expect(payload1.data.personalProjectId).toEqual(null);
    expect(payload1.data.currentProjectId).toEqual(null);
  });

  it('/user/session (GET) ok bad cookie', async () => {
    // step 1: session
    const query1: InjectOptions = getUserSessionQuery({ cookie: 'qwe' });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(200);
    expect(payload1.status).toEqual('ok');
    expect(payload1.data.userId).toEqual(null);
    expect(payload1.data.registration).toEqual(false);
    expect(payload1.data.login).toEqual(false);
    expect(payload1.data.personalProjectId).toEqual(null);
    expect(payload1.data.currentProjectId).toEqual(null);
  });

  it('/user/logout (POST) ok registered', async () => {
    // registration -> logout
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: phones[5] });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    await app.inject(query2);
    // step 3: logout
    const query3: InjectOptions = getUserLogoutQuery({ cookie: cookie1 });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(200);
    expect(payload3.status).toEqual('ok');
  });

  it('/user/logout (POST) ok logged in', async () => {
    // registration -> logout -> login -> logout
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: phones[6] });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    await app.inject(query2);
    // step 3: logout
    const query3: InjectOptions = getUserLogoutQuery({ cookie: cookie1 });
    await app.inject(query3);
    // step 4: auth
    const query4: InjectOptions = getUserAuthQuery({ phone: phones[6] });
    const result4 = await app.inject(query4);
    const cookie4 = result4.headers['set-cookie'].toString();
    const payload4 = JSON.parse(result4.payload);
    // step 5: code
    const query5: InjectOptions = getUserCodeQuery({ code: payload4.data.code, cookie: cookie4 });
    await app.inject(query5);
    // step 6: logout
    const query6: InjectOptions = getUserLogoutQuery({ cookie: cookie4 });
    const result6 = await app.inject(query6);
    const payload6 = JSON.parse(result6.payload);
    expect(result6.statusCode).toEqual(200);
    expect(payload6.status).toEqual('ok');
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });
});
