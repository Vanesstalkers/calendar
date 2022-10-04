import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { prepareApp } from './../helpers/prepare';
import { InjectOptions } from 'light-my-request';
import {
  getUserAuthQuery,
  getUserCodeQuery,
  getUserGetOneQuery,
  getUserLogoutQuery,
  getUserSearchQuery,
  getUserSessionQuery,
} from './../helpers/queryBuilders';
import { phones } from './../helpers/constants.json';

const phonesList = phones.slice(31, 40);
function getPhone() {
  return phonesList.shift();
}

describe('UserController /user/search (e2e)', () => {
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

  it('/user/search (GET) ok', async () => {
    // create user 1 -> create user 2 -> user 2 search user 1
    // step 1: auth
    const name = 'test_user_name_003';
    const phone = getPhone();
    const query1: InjectOptions = getUserAuthQuery({ phone, name });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    await app.inject(query2);
    // step 3: auth
    const query3: InjectOptions = getUserAuthQuery({ phone: getPhone() });
    const result3 = await app.inject(query3);
    const cookie3 = result3.headers['set-cookie'].toString();
    const payload3 = JSON.parse(result3.payload);
    // step 4: code
    const query4: InjectOptions = getUserCodeQuery({ code: payload3.data.code, cookie: cookie3 });
    const result4 = await app.inject(query4);
    const cookie4 = result4.headers['set-cookie'].toString();
    // step 5: search
    const query5: InjectOptions = getUserSearchQuery({ cookie: cookie4, queryStr: name });
    const result5 = await app.inject(query5);
    const payload5 = JSON.parse(result5.payload);
    expect(result5.statusCode).toEqual(200);
    expect(payload5.status).toEqual('ok');
    expect(payload5.data.resultList instanceof Array).toEqual(true);
    expect(payload5.data.resultList.length).toEqual(1);
    expect(payload5.data.endOfList).toEqual(true);
    expect(payload5.data.resultList[0].id).not.toBeNaN();
    expect(payload5.data.resultList[0].phone).toEqual(phone);
    expect(payload5.data.resultList[0].name).toEqual(name);
    expect(payload5.data.resultList[0].iconFileId).toEqual(null);
  });
});
