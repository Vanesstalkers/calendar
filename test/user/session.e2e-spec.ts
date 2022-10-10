import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createOrGetUser, prepareApp } from './../helpers/prepare';
import { InjectOptions } from 'light-my-request';
import {
  getUserAuthQuery,
  getUserCodeQuery,
  getUserLogoutQuery,
  getUserSessionQuery,
} from './../helpers/queryBuilders';
import { phones } from './../helpers/constants.json';

const phonesList = phones.slice(30, 40);
function getPhone() {
  return phonesList.shift();
}

describe('UserController /user/session (e2e)', () => {
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

  it('/user/session (GET) ok login true registration true', async () => {
    // step 1: create user
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 1: session
    const query1: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(200);
    expect(payload1.status).toEqual('ok');
    expect(payload1.data.userId).not.toBeNaN();
    expect(payload1.data.registration).toEqual(true);
    expect(payload1.data.login).toEqual(true);
    expect(payload1.data.personalProjectId).not.toBeNaN();
    expect(payload1.data.currentProjectId).not.toBeNaN();
  });

  it('/user/session (GET) ok login false registration false', async () => {
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: getPhone() });
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
    // step 1: create user
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 2: logout
    const query2: InjectOptions = getUserLogoutQuery({ cookie: cookie1 });
    await app.inject(query2);
    // step 3: session
    const query3: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(200);
    expect(payload3.status).toEqual('ok');
    expect(payload3.data.userId).not.toBeNaN();
    expect(payload3.data.registration).toEqual(true);
    expect(payload3.data.login).toEqual(false);
    expect(payload3.data.personalProjectId).not.toBeNaN();
    expect(payload3.data.currentProjectId).not.toBeNaN();
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
});
