import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { prepareApp } from './../helpers/prepare';
import { InjectOptions } from 'light-my-request';
import { getUserAuthQuery, getUserCodeQuery, getUserLogoutQuery } from './../helpers/queryBuilders';
import { phones } from './../helpers/constants.json';

describe('UserController /user/logout (e2e)', () => {
  let app: NestFastifyApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await prepareApp(moduleFixture);
  });

  it('/user/logout (POST) ok registered', async () => {
    // registration -> logout
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: phones[6] });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    const result2 = await app.inject(query2);
    const cookie2 = result2.headers['set-cookie'].toString();
    // step 3: logout
    const query3: InjectOptions = getUserLogoutQuery({ cookie: cookie2 });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(200);
    expect(payload3.status).toEqual('ok');
  });

  it('/user/logout (POST) ok logged in', async () => {
    // registration -> logout -> login -> logout
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: phones[7] });
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
    const query4: InjectOptions = getUserAuthQuery({ phone: phones[7] });
    const result4 = await app.inject(query4);
    const cookie4 = result4.headers['set-cookie'].toString();
    const payload4 = JSON.parse(result4.payload);
    // step 5: code
    const query5: InjectOptions = getUserCodeQuery({ code: payload4.data.code, cookie: cookie4 });
    const result5 = await app.inject(query5);
    const cookie5 = result5.headers['set-cookie'].toString();
    // step 6: logout
    const query6: InjectOptions = getUserLogoutQuery({ cookie: cookie5 });
    const result6 = await app.inject(query6);
    const payload6 = JSON.parse(result6.payload);
    expect(result6.statusCode).toEqual(200);
    expect(payload6.status).toEqual('ok');
  });

  it('/user/logout (POST) ok bad cookie', async () => {
    // step 1: logout
    const query1: InjectOptions = getUserLogoutQuery({ cookie: 'qqq' });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(200);
    expect(payload1.status).toEqual('ok');
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });
});
