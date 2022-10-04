import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { prepareApp } from './../helpers/prepare';
import { InjectOptions } from 'light-my-request';
import { getUserAuthQuery, getUserCodeQuery, getUserSearchQuery } from './../helpers/queryBuilders';
import { phones } from './../helpers/constants.json';

const phonesList = phones.slice(40, 70);
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

  it('/user/search (POST) ok name', async () => {
    // create user 1 -> create user 2 -> user 2 search user 1
    // step 1: auth
    const name = 'test_user_search_001';
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

  it('/user/search (POST) ok phone', async () => {
    // create user 1 -> create user 2 -> user 2 search user 1
    // step 1: auth
    const name = 'test_user_search_002';
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
    const query5: InjectOptions = getUserSearchQuery({ cookie: cookie4, queryStr: phone });
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

  it('/user/search (POST) ok multiple', async () => {
    // create user 1 -> create user 2 -> user 2 search user 1
    const usersCount = 3;
    const name = 'test_user_search_003';
    let phonesArr = [];
    for (let index = 0; index < usersCount; index++) {
      // step 1: auth
      const phone = getPhone();
      phonesArr.push(phone);
      const query1: InjectOptions = getUserAuthQuery({ phone, name });
      const result1 = await app.inject(query1);
      const cookie1 = result1.headers['set-cookie'].toString();
      const payload1 = JSON.parse(result1.payload);
      // step 2: code
      const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
      await app.inject(query2);
    }
    phonesArr = phonesArr.reverse();
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
    expect(payload5.data.resultList.length).toEqual(usersCount);
    expect(payload5.data.endOfList).toEqual(true);
    for (let index = 0; index < payload5.data.resultList.length; index++) {
      const resultItem = payload5.data.resultList[index];
      expect(resultItem.id).not.toBeNaN();
      expect(resultItem.phone).toEqual(phonesArr[index]);
      expect(resultItem.name).toEqual(name);
      expect(resultItem.iconFileId).toEqual(null);
    }
  });

  it('/user/search (POST) ok pagination', async () => {
    // create user 1 -> create user 2 -> user 2 search user 1
    const usersCount = 5;
    const name = 'test_user_search_004';
    const offset = 2;
    const limit = 2;
    let phonesArr = [];
    for (let index = 0; index < usersCount; index++) {
      // step 1: auth
      const phone = getPhone();
      phonesArr.push(phone);
      const query1: InjectOptions = getUserAuthQuery({ phone, name });
      const result1 = await app.inject(query1);
      const cookie1 = result1.headers['set-cookie'].toString();
      const payload1 = JSON.parse(result1.payload);
      // step 2: code
      const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
      await app.inject(query2);
    }
    phonesArr = phonesArr.reverse().slice(offset, offset + limit);
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
    const query5: InjectOptions = getUserSearchQuery({ cookie: cookie4, queryStr: name, offset, limit });
    const result5 = await app.inject(query5);
    const payload5 = JSON.parse(result5.payload);
    expect(result5.statusCode).toEqual(200);
    expect(payload5.status).toEqual('ok');
    expect(payload5.data.resultList instanceof Array).toEqual(true);
    expect(payload5.data.resultList.length).toEqual(limit);
    expect(payload5.data.endOfList).toEqual(false);
    for (let index = 0; index < payload5.data.resultList.length; index++) {
      const resultItem = payload5.data.resultList[index];
      expect(resultItem.id).not.toBeNaN();
      expect(resultItem.phone).toEqual(phonesArr[index]);
      expect(resultItem.name).toEqual(name);
      expect(resultItem.iconFileId).toEqual(null);
    }
  });

  it('/user/search (POST) ok same user', async () => {
    // create user 1 -> user 1 search user 1
    // step 1: auth
    const phone = getPhone();
    const query1: InjectOptions = getUserAuthQuery({ phone });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    const result2 = await app.inject(query2);
    const cookie2 = result2.headers['set-cookie'].toString();
    // step 5: search
    const query3: InjectOptions = getUserSearchQuery({ cookie: cookie2, queryStr: phone });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(200);
    expect(payload3.status).toEqual('ok');
    expect(payload3.data.resultList instanceof Array).toEqual(true);
    expect(payload3.data.resultList.length).toEqual(0);
    expect(payload3.data.endOfList).toEqual(true);
  });

  it('/user/search (POST) ok globalSearch false u2u false', async () => {
    // create user 1 -> create user 2 -> user 2 search user 1
    // step 1: auth
    const phone = getPhone();
    const query1: InjectOptions = getUserAuthQuery({ phone });
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
    const query5: InjectOptions = getUserSearchQuery({ cookie: cookie4, queryStr: phone, globalSearch: false });
    const result5 = await app.inject(query5);
    const payload5 = JSON.parse(result5.payload);
    expect(result5.statusCode).toEqual(200);
    expect(payload5.status).toEqual('ok');
    expect(payload5.data.resultList instanceof Array).toEqual(true);
    expect(payload5.data.resultList.length).toEqual(0);
    expect(payload5.data.endOfList).toEqual(true);
  });

  // TODO: globalSearch false u2u true

  it('/user/search (POST) ok bad query', async () => {
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: getPhone() });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    const result2 = await app.inject(query2);
    const cookie2 = result2.headers['set-cookie'].toString();
    // step 3: search
    const query3: InjectOptions = getUserSearchQuery({ cookie: cookie2, queryStr: 'qqq' });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(200);
    expect(payload3.status).toEqual('ok');
    expect(payload3.data.resultList instanceof Array).toEqual(true);
    expect(payload3.data.resultList.length).toEqual(0);
    expect(payload3.data.endOfList).toEqual(true);
  });

  it('/user/search (POST) ok missing query', async () => {
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: getPhone() });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    const result2 = await app.inject(query2);
    const cookie2 = result2.headers['set-cookie'].toString();
    // step 3: search
    const query3: InjectOptions = getUserSearchQuery({ cookie: cookie2, queryStr: null });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(200);
    expect(payload3.status).toEqual('ok');
    expect(payload3.data.resultList instanceof Array).toEqual(true);
    expect(payload3.data.resultList.length).toBeGreaterThan(10);
    expect(payload3.data.endOfList).toBeDefined();
    for (let index = 0; index < payload3.data.resultList.length; index++) {
      const resultItem = payload3.data.resultList[index];
      expect(resultItem.id).not.toBeNaN();
      expect(resultItem.phone).toBeDefined();
      expect(resultItem.name).toBeDefined();
      expect(resultItem.iconFileId).toEqual(null);
    }
  });

  it('/user/search (POST) ok bad globalSearch', async () => {
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: getPhone() });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    const result2 = await app.inject(query2);
    const cookie2 = result2.headers['set-cookie'].toString();
    // step 3: search
    const query3: InjectOptions = getUserSearchQuery({ cookie: cookie2, queryStr: '', globalSearch: 'qwe' });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(200);
    expect(payload3.status).toEqual('ok');
    expect(payload3.data.resultList instanceof Array).toEqual(true);
    expect(payload3.data.resultList.length).toBeGreaterThan(10);
    expect(payload3.data.endOfList).toBeDefined();
    for (let index = 0; index < payload3.data.resultList.length; index++) {
      const resultItem = payload3.data.resultList[index];
      expect(resultItem.id).not.toBeNaN();
      expect(resultItem.phone).toBeDefined();
      expect(resultItem.name).toBeDefined();
      expect(resultItem.iconFileId).toEqual(null);
    }
  });

  it('/user/search (POST) ok missing globalSearch', async () => {
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: getPhone() });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    const result2 = await app.inject(query2);
    const cookie2 = result2.headers['set-cookie'].toString();
    // step 3: search
    const query3: InjectOptions = getUserSearchQuery({ cookie: cookie2, queryStr: '', globalSearch: null });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(200);
    expect(payload3.status).toEqual('ok');
    expect(payload3.data.resultList instanceof Array).toEqual(true);
    expect(payload3.data.resultList.length).toEqual(0);
    expect(payload3.data.endOfList).toEqual(true);
  });

  it('/user/search (POST) err bad offset', async () => {
    const badOffset = 'qqq';
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: getPhone() });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    const result2 = await app.inject(query2);
    const cookie2 = result2.headers['set-cookie'].toString();
    // step 3: search
    const query3: InjectOptions = getUserSearchQuery({ cookie: cookie2, queryStr: '', offset: badOffset });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(400);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual('/user/search');
    expect(payload3.msg).toEqual(`invalid input syntax for type bigint: "${badOffset}"`);
    expect(payload3.code).toEqual('DB_BAD_QUERY');
  });

  it('/user/search (POST) err missing offset', async () => {
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: getPhone() });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    const result2 = await app.inject(query2);
    const cookie2 = result2.headers['set-cookie'].toString();
    // step 3: search
    const query3: InjectOptions = getUserSearchQuery({ cookie: cookie2, queryStr: '', offset: null });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(500);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual('/user/search');
  });

  it('/user/search (POST) err bad limit', async () => {
    const badLimit = 'qqq';
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: getPhone() });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    const result2 = await app.inject(query2);
    const cookie2 = result2.headers['set-cookie'].toString();
    // step 3: search
    const query3: InjectOptions = getUserSearchQuery({ cookie: cookie2, queryStr: '', limit: badLimit });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(400);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual('/user/search');
    expect(payload3.msg).toEqual(`invalid input syntax for type bigint: "${badLimit}1"`);
    expect(payload3.code).toEqual('DB_BAD_QUERY');
  });

  it('/user/search (POST) err missing limit', async () => {
    // step 1: auth
    const query1: InjectOptions = getUserAuthQuery({ phone: getPhone() });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    const result2 = await app.inject(query2);
    const cookie2 = result2.headers['set-cookie'].toString();
    // step 3: search
    const query3: InjectOptions = getUserSearchQuery({ cookie: cookie2, queryStr: '', limit: null });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(400);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual('/user/search');
    expect(payload3.msg).toEqual('column "nan" does not exist');
    expect(payload3.code).toEqual('DB_BAD_QUERY');
  });

  it('/user/search (POST) err bad cookie', async () => {
    const badCookie = 'qqq';
    // step 1: search
    const query1: InjectOptions = getUserSearchQuery({ cookie: badCookie, queryStr: '' });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(403);
    expect(payload1.status).toEqual('err');
    expect(payload1.timestamp).toBeDefined();
    expect(payload1.path).toEqual('/user/search');
    expect(payload1.msg).toEqual('Access denied (login first)');
    expect(payload1.code).toEqual('NEED_LOGIN');
  });

  it('/user/search (POST) err missing cookie', async () => {
    // step 1: search
    const query1: InjectOptions = getUserSearchQuery({ queryStr: '' });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(403);
    expect(payload1.status).toEqual('err');
    expect(payload1.timestamp).toBeDefined();
    expect(payload1.path).toEqual('/user/search');
    expect(payload1.msg).toEqual('Access denied (login first)');
    expect(payload1.code).toEqual('NEED_LOGIN');
  });
});
