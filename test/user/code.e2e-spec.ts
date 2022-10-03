import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { prepareApp } from './../helpers/prepare';
import { InjectOptions } from 'light-my-request';
import { getUserAuthQuery, getUserCodeQuery, getUserLogoutQuery } from './../helpers/queryBuilders';
import { phones } from './../helpers/constants.json';

describe('UserController /user/code (e2e)', () => {
  let app: NestFastifyApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await prepareApp(moduleFixture);
  });

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
    const cookie2 = result2.headers['set-cookie'].toString();
    expect(result2.statusCode).toEqual(200);
    expect(payload2.status).toEqual('ok');
    expect(cookie2).toContain('session=');
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
    const result2 = await app.inject(query2);
    const cookie2 = result2.headers['set-cookie'].toString();
    // step 3: logout
    const query3: InjectOptions = getUserLogoutQuery({ cookie: cookie2 });
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
    const cookie5 = result5.headers['set-cookie'].toString();
    expect(result5.statusCode).toEqual(200);
    expect(payload5.status).toEqual('ok');
    expect(cookie5).toContain('session=');
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

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });
});
