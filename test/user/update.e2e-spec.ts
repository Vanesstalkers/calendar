import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { prepareApp } from './../helpers/prepare';
import { InjectOptions } from 'light-my-request';
import {
  getUserAuthQuery,
  getUserChangeCurrentProjectQuery,
  getUserCodeQuery,
  getUserGetOneQuery,
  getUserLogoutQuery,
  getUserSearchQuery,
  getUserSessionQuery,
  getUserUpdateQuery,
} from './../helpers/queryBuilders';
import { phones } from './../helpers/constants.json';
import { readFileSync } from 'fs';

const phonesList = phones.slice(80, 90);
function getPhone() {
  return phonesList.shift();
}

describe('UserController /user/update (e2e)', () => {
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

  it('/user/update (POST) ok', async () => {
    // step 1: auth
    const name = 'test_user_update_001';
    const phone = getPhone();
    const newName = 'test_user_update_002';
    const newTimezone = 'Europe/Moscow';
    const newPhoneCode = '8';
    const query1: InjectOptions = getUserAuthQuery({ phone, name });
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
    const userId = payload3.data.userId;
    // step 4: update
    const query4: InjectOptions = getUserUpdateQuery({
      cookie: cookie2,
      name: newName,
      timezone: newTimezone,
      phoneCode: newPhoneCode,
      userId,
    });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    expect(result4.statusCode).toEqual(200);
    expect(payload4.status).toEqual('ok');
    // step 5: getOne
    const query5: InjectOptions = getUserGetOneQuery({ cookie: cookie2, userId: userId.toString() });
    const result5 = await app.inject(query5);
    const payload5 = JSON.parse(result5.payload);
    expect(result5.statusCode).toEqual(200);
    expect(payload5.status).toEqual('ok');
    expect(payload5.data.name).toEqual(newName);
    expect(payload5.data.phone).toEqual(phone);
    expect(payload5.data.timezone).toEqual(newTimezone);
    expect(payload5.data.config.phoneCode).toEqual(newPhoneCode);
  });

  // TODO: fileName?
  // TODO: fileMimetype
  // TODO: fileExtension
  // TODO: fileContent

  it('/user/update (POST) err change phone', async () => {
    // step 1: auth
    const phone = getPhone();
    const newPhone = getPhone();
    const query1: InjectOptions = getUserAuthQuery({ phone });
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
    const userId = payload3.data.userId;
    // step 4: update
    const query4: InjectOptions = getUserUpdateQuery({
      cookie: cookie2,
      phone: newPhone,
      userId,
    });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    expect(result4.statusCode).toEqual(400);
    expect(payload4.status).toEqual('err');
    expect(payload4.timestamp).toBeDefined();
    expect(payload4.path).toEqual('/user/update');
    expect(payload4.msg).toEqual('Access denied to change phone number');
  });

  it('/user/update (POST) err change another user', async () => {
    // user try change anothe user
    // step 1: auth
    const name = 'test_user_update_003';
    const newName = 'test_user_update_004';
    const phone1 = getPhone();
    const query1: InjectOptions = getUserAuthQuery({ phone: phone1, name });
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
    const userId = payload3.data.userId;
    // user#1 is created, userId is user#1 id
    // step 4: auth
    const phone4 = getPhone();
    // phone4 is user#2 phone
    const query4: InjectOptions = getUserAuthQuery({ phone: phone4 });
    const result4 = await app.inject(query4);
    const cookie4 = result4.headers['set-cookie'].toString();
    const payload4 = JSON.parse(result4.payload);
    // step 5: code
    const query5: InjectOptions = getUserCodeQuery({ code: payload4.data.code, cookie: cookie4 });
    const result5 = await app.inject(query5);
    const cookie5 = result5.headers['set-cookie'].toString();
    // user#2 is created, cookie5 is user#2 cookie
    // step 6: update
    const query6: InjectOptions = getUserUpdateQuery({
      cookie: cookie5,
      name: newName,
      userId,
    });
    const result6 = await app.inject(query6);
    const payload6 = JSON.parse(result6.payload);
    // TODO: update after fix
    expect(result6.statusCode).toEqual(200);
  });

  it('/user/update (POST) err bad cookie', async () => {
    // step 1: auth
    const badCookie = 'qqq';
    const phone = getPhone();
    const newTimezone = 'Europe/Moscow';
    const newPhoneCode = '8';
    const query1: InjectOptions = getUserAuthQuery({ phone });
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
    const userId = payload3.data.userId;
    // step 4: update
    const query4: InjectOptions = getUserUpdateQuery({
      cookie: cookie2,
      timezone: newTimezone,
      phoneCode: newPhoneCode,
      userId,
    });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    expect(result4.statusCode).toEqual(200);
    expect(payload4.status).toEqual('ok');
    // step 5: getOne
    const query5: InjectOptions = getUserGetOneQuery({ cookie: badCookie, userId: userId.toString() });
    const result5 = await app.inject(query5);
    const payload5 = JSON.parse(result5.payload);
    expect(result5.statusCode).toEqual(403);
    expect(payload5.status).toEqual('err');
    expect(payload5.timestamp).toBeDefined();
    expect(payload5.path).toEqual(`/user/getOne?userId=${userId}`);
    expect(payload5.msg).toEqual('Access denied (login first)');
    expect(payload5.code).toEqual('NEED_LOGIN');
  });

  it('/user/update (POST) err missing cookie', async () => {
    // step 1: auth
    const phone = getPhone();
    const newTimezone = 'Europe/Moscow';
    const newPhoneCode = '8';
    const query1: InjectOptions = getUserAuthQuery({ phone });
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
    const userId = payload3.data.userId;
    // step 4: update
    const query4: InjectOptions = getUserUpdateQuery({
      cookie: cookie2,
      timezone: newTimezone,
      phoneCode: newPhoneCode,
      userId,
    });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    expect(result4.statusCode).toEqual(200);
    expect(payload4.status).toEqual('ok');
    // step 5: getOne
    const query5: InjectOptions = getUserGetOneQuery({ userId: userId.toString() });
    const result5 = await app.inject(query5);
    const payload5 = JSON.parse(result5.payload);
    expect(result5.statusCode).toEqual(403);
    expect(payload5.status).toEqual('err');
    expect(payload5.timestamp).toBeDefined();
    expect(payload5.path).toEqual(`/user/getOne?userId=${userId}`);
    expect(payload5.msg).toEqual('Access denied (login first)');
    expect(payload5.code).toEqual('NEED_LOGIN');
  });
});
