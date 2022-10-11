import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createOrGetUser, prepareApp } from './../helpers/prepare';
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
  let sharedCookie: string;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await prepareApp(moduleFixture);
    // create user to interact to other users
    const phone = getPhone();
    const createOrGetUserResult = await createOrGetUser({ phone, app });
    sharedCookie = createOrGetUserResult.cookie;
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });

  it('/user/search (POST) ok name', async () => {
    // step 1: create user
    const name = 'test_user_search_001';
    const phone = getPhone();
    await createOrGetUser({ phone, name, app });
    // step 2: search
    const query2: InjectOptions = getUserSearchQuery({ cookie: sharedCookie, queryStr: name });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(200);
    expect(payload2.status).toEqual('ok');
    expect(payload2.data.resultList instanceof Array).toEqual(true);
    expect(payload2.data.resultList.length).toEqual(1);
    expect(payload2.data.endOfList).toEqual(true);
    expect(payload2.data.resultList[0].id).not.toBeNaN();
    expect(payload2.data.resultList[0].phone).toEqual(phone);
    expect(payload2.data.resultList[0].name).toEqual(name);
    expect(payload2.data.resultList[0].iconFileId).toEqual(null);
  });

  it('/user/search (POST) ok phone', async () => {
    // step 1: create user
    const name = 'test_user_search_002';
    const phone = getPhone();
    await createOrGetUser({ phone, name, app });
    // step 5: search
    const query5: InjectOptions = getUserSearchQuery({ cookie: sharedCookie, queryStr: phone });
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
    const usersCount = 3;
    // step 1: create users
    const name = 'test_user_search_003';
    let phonesArr = [];
    for (let index = 0; index < usersCount; index++) {
      const phone = getPhone();
      await createOrGetUser({ phone, name, app });
      phonesArr.push(phone);
    }
    phonesArr = phonesArr.reverse();
    // step 2: search
    const query2: InjectOptions = getUserSearchQuery({ cookie: sharedCookie, queryStr: name });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(200);
    expect(payload2.status).toEqual('ok');
    expect(payload2.data.resultList instanceof Array).toEqual(true);
    expect(payload2.data.resultList.length).toEqual(usersCount);
    expect(payload2.data.endOfList).toEqual(true);
    for (let index = 0; index < payload2.data.resultList.length; index++) {
      const resultItem = payload2.data.resultList[index];
      expect(resultItem.id).not.toBeNaN();
      expect(resultItem.phone).toEqual(phonesArr[index]);
      expect(resultItem.name).toEqual(name);
      expect(resultItem.iconFileId).toEqual(null);
    }
  });

  it('/user/search (POST) ok pagination', async () => {
    const usersCount = 5;
    const offset = 2;
    const limit = 2;
    // step 1: create users
    const name = 'test_user_search_004';
    let phonesArr = [];
    for (let index = 0; index < usersCount; index++) {
      const phone = getPhone();
      await createOrGetUser({ phone, name, app });
      phonesArr.push(phone);
    }
    phonesArr = phonesArr.reverse().slice(offset, offset + limit);
    // step 2: search
    const query2: InjectOptions = getUserSearchQuery({ cookie: sharedCookie, queryStr: name, offset, limit });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(200);
    expect(payload2.status).toEqual('ok');
    expect(payload2.data.resultList instanceof Array).toEqual(true);
    expect(payload2.data.resultList.length).toEqual(limit);
    expect(payload2.data.endOfList).toEqual(false);
    for (let index = 0; index < payload2.data.resultList.length; index++) {
      const resultItem = payload2.data.resultList[index];
      expect(resultItem.id).not.toBeNaN();
      expect(resultItem.phone).toEqual(phonesArr[index]);
      expect(resultItem.name).toEqual(name);
      expect(resultItem.iconFileId).toEqual(null);
    }
  });

  it('/user/search (POST) ok same user', async () => {
    // create user 1 -> user 1 search for user 1
    // step 1: create user
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 2: search
    const query2: InjectOptions = getUserSearchQuery({ cookie: cookie1, queryStr: phone });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(200);
    expect(payload2.status).toEqual('ok');
    expect(payload2.data.resultList instanceof Array).toEqual(true);
    expect(payload2.data.resultList.length).toEqual(0);
    expect(payload2.data.endOfList).toEqual(true);
  });

  it('/user/search (POST) ok globalSearch false u2u false', async () => {
    // step 1: create user
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 5: search
    const query5: InjectOptions = getUserSearchQuery({ cookie: cookie1, queryStr: phone, globalSearch: false });
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
    const badQuery = 'qqqqqqqqqqqqqqq';
    // step 3: search
    const query1: InjectOptions = getUserSearchQuery({ cookie: sharedCookie, queryStr: badQuery });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(200);
    expect(payload1.status).toEqual('ok');
    expect(payload1.data.resultList instanceof Array).toEqual(true);
    expect(payload1.data.resultList.length).toEqual(0);
    expect(payload1.data.endOfList).toEqual(true);
  });

  it('/user/search (POST) ok missing query', async () => {
    // step 1: search
    const query1: InjectOptions = getUserSearchQuery({ cookie: sharedCookie, queryStr: null });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(200);
    expect(payload1.status).toEqual('ok');
    expect(payload1.data.resultList instanceof Array).toEqual(true);
    expect(payload1.data.resultList.length).toBeGreaterThan(1);
    expect(payload1.data.endOfList).toBeDefined();
    for (let index = 0; index < payload1.data.resultList.length; index++) {
      const resultItem = payload1.data.resultList[index];
      expect(resultItem.id).not.toBeNaN();
      expect(resultItem.phone).toBeDefined();
      expect(resultItem.name).toBeDefined();
      expect(resultItem.iconFileId).toBeDefined();
    }
  });

  it('/user/search (POST) ok bad globalSearch', async () => {
    // step 1: search
    const query1: InjectOptions = getUserSearchQuery({ cookie: sharedCookie, globalSearch: 'qwe' });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(200);
    expect(payload1.status).toEqual('ok');
    expect(payload1.data.resultList instanceof Array).toEqual(true);
    expect(payload1.data.resultList.length).toBeGreaterThan(1);
    expect(payload1.data.endOfList).toBeDefined();
    for (let index = 0; index < payload1.data.resultList.length; index++) {
      const resultItem = payload1.data.resultList[index];
      expect(resultItem.id).not.toBeNaN();
      expect(resultItem.phone).toBeDefined();
      expect(resultItem.name).toBeDefined();
      expect(resultItem.iconFileId).toBeDefined();
    }
  });

  it('/user/search (POST) ok missing globalSearch', async () => {
    // step 1: search
    const query1: InjectOptions = getUserSearchQuery({ cookie: sharedCookie, globalSearch: null });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(200);
    expect(payload1.status).toEqual('ok');
    expect(payload1.data.resultList instanceof Array).toEqual(true);
    expect(payload1.data.resultList.length).toEqual(0);
    expect(payload1.data.endOfList).toEqual(true);
  });

  it('/user/search (POST) err bad offset', async () => {
    const badOffset = 'qqqqqqqqq';
    // step 1: search
    const query1: InjectOptions = getUserSearchQuery({ cookie: sharedCookie, offset: badOffset });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(400);
    expect(payload1.status).toEqual('err');
    expect(payload1.timestamp).toBeDefined();
    expect(payload1.path).toEqual('/user/search');
    expect(payload1.msg).toEqual(`invalid input syntax for type bigint: "${badOffset}"`);
    expect(payload1.code).toEqual('DB_BAD_QUERY');
  });

  it('/user/search (POST) ok missing offset', async () => {
    // step 1: search
    const query1: InjectOptions = getUserSearchQuery({ cookie: sharedCookie, offset: null });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(200);
    expect(payload1.status).toEqual('ok');
    expect(payload1.data.resultList instanceof Array).toEqual(true);
    expect(payload1.data.resultList.length).toBeGreaterThan(1);
    expect(payload1.data.endOfList).toBeDefined();
    for (let index = 0; index < payload1.data.resultList.length; index++) {
      const resultItem = payload1.data.resultList[index];
      expect(resultItem.id).not.toBeNaN();
      expect(resultItem.phone).toBeDefined();
      expect(resultItem.name).toBeDefined();
      expect(resultItem.iconFileId).toBeDefined();
    }
  });

  it('/user/search (POST) err bad limit', async () => {
    const badLimit = 'qqqqqqqqqqqqq';
    // step 1: search
    const query1: InjectOptions = getUserSearchQuery({ cookie: sharedCookie, limit: badLimit });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(400);
    expect(payload1.status).toEqual('err');
    expect(payload1.timestamp).toBeDefined();
    expect(payload1.path).toEqual('/user/search');
    expect(payload1.msg).toEqual(`invalid input syntax for type bigint: "${badLimit}1"`);
    expect(payload1.code).toEqual('DB_BAD_QUERY');
  });

  it('/user/search (POST) ok missing limit', async () => {
    // step 1: search
    const query1: InjectOptions = getUserSearchQuery({ cookie: sharedCookie, limit: null });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(200);
    expect(payload1.status).toEqual('ok');
    expect(payload1.data.resultList instanceof Array).toEqual(true);
    expect(payload1.data.resultList.length).toBeGreaterThan(1);
    expect(payload1.data.endOfList).toBeDefined();
    for (let index = 0; index < payload1.data.resultList.length; index++) {
      const resultItem = payload1.data.resultList[index];
      expect(resultItem.id).not.toBeNaN();
      expect(resultItem.phone).toBeDefined();
      expect(resultItem.name).toBeDefined();
      expect(resultItem.iconFileId).toBeDefined();
    }
  });

  it('/user/search (POST) err bad cookie', async () => {
    const badCookie = 'qqq';
    // step 1: search
    const query1: InjectOptions = getUserSearchQuery({ cookie: badCookie });
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
    const query1: InjectOptions = getUserSearchQuery({});
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
