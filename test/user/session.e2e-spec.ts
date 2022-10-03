import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { prepareApp } from './../helpers/prepare';
import { InjectOptions } from 'light-my-request';
import {
  getUserAuthQuery,
  getUserCodeQuery,
  getUserLogoutQuery,
  getUserSessionQuery,
} from './../helpers/queryBuilders';
import { phones } from './../helpers/constants.json';

describe('UserController /user/session (e2e)', () => {
  let app: NestFastifyApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await prepareApp(moduleFixture);
  });

  it('/user/session (GET) ok login true registration true', async () => {
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: phones[3] });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    const result2 = await app.inject(query2);
    const cookie2 = result2.headers['set-cookie'].toString();
    // step 3: session
    const query3: InjectOptions = getUserSessionQuery({ cookie: cookie2 });
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
    const query1: InjectOptions = getUserAuthQuery({ phone: phones[5] });
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
    // step 4: session
    const query4: InjectOptions = getUserSessionQuery({ cookie: cookie2 });
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

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });
});
