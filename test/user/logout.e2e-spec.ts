import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createOrGetUser, prepareApp } from './../helpers/prepare';
import { InjectOptions } from 'light-my-request';
import { getUserLogoutQuery } from './../helpers/queryBuilders';
import { phones } from './../helpers/constants.json';

const phonesList = phones.slice(20, 30);
function getPhone() {
  return phonesList.shift();
}

describe('UserController /user/logout (e2e)', () => {
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

  it('/user/logout (POST) ok registered', async () => {
    // registration -> logout
    // step 1: registration
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 2: logout
    const query2: InjectOptions = getUserLogoutQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(200);
    expect(payload2.status).toEqual('ok');
  });

  it('/user/logout (POST) ok logged in', async () => {
    // registration -> logout -> login -> logout
    // step 1: registration
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 2: logout
    const query2: InjectOptions = getUserLogoutQuery({ cookie: cookie1 });
    await app.inject(query2);
    // step 3: login
    const { cookie: cookie3 } = await createOrGetUser({ phone, app });
    // step 4: logout
    const query4: InjectOptions = getUserLogoutQuery({ cookie: cookie3 });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    expect(result4.statusCode).toEqual(200);
    expect(payload4.status).toEqual('ok');
  });

  it('/user/logout (POST) ok bad cookie', async () => {
    // step 1: logout
    const query1: InjectOptions = getUserLogoutQuery({ cookie: 'qqq' });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(200);
    expect(payload1.status).toEqual('ok');
  });
});
