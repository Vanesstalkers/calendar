import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createOrGetUser, prepareApp } from './../helpers/prepare';
import { InjectOptions } from 'light-my-request';
import {
  getUserAuthQuery,
  getUserCodeQuery,
  getUserGetOneQuery,
  getUserSessionQuery,
  getUserUpdateQuery,
} from './../helpers/queryBuilders';
import { phones } from './../helpers/constants.json';
import { readFile } from 'fs/promises';

const phonesList = phones.slice(80, 100);
function getPhone() {
  return phonesList.shift();
}

describe('UserController /user/update (e2e)', () => {
  let app: NestFastifyApplication;
  let moduleFixture: TestingModule;
  let fileContent: string;
  let fileData: string;
  const fileExtension = 'png';
  const fileName = `tua.${fileExtension}`;
  const fileMimetype = `image/${fileExtension}`;
  const sourcePath = `test/assets/${fileName}`;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await prepareApp(moduleFixture);
    fileData = await readFile(sourcePath, 'base64');
    fileContent = `data:image/png;base64,${fileData}`;
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });

  it('/user/update (POST) ok full', async () => {
    const newName = 'test_user_update_002';
    const newTimezone = 'Europe/Moscow';
    const newPhoneCode = '8';
    // step 1: create user
    const phone = getPhone();
    const name = 'test_user_update_001';
    const { cookie: cookie1 } = await createOrGetUser({ phone, name, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: update
    const query3: InjectOptions = getUserUpdateQuery({
      cookie: cookie1,
      name: newName,
      timezone: newTimezone,
      phoneCode: newPhoneCode,
      userId,
      isIconFile: true,
      fileExtension,
      fileName,
      fileMimetype,
      fileContent,
    });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(200);
    expect(payload3.status).toEqual('ok');
    expect(payload3.data.uploadedFileId).not.toBeNaN();
    // step 4: getOne
    const query4: InjectOptions = getUserGetOneQuery({ cookie: cookie1, userId: userId.toString() });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    expect(payload4.data.iconFileId).toEqual(payload3.data.uploadedFileId);
    expect(payload4.data.name).toEqual(newName);
    expect(payload4.data.phone).toEqual(phone);
    expect(payload4.data.timezone).toEqual(newTimezone);
    expect(payload4.data.config.phoneCode).toEqual(newPhoneCode);
  });

  it('/user/update (POST) ok no iconFile', async () => {
    const newName = 'test_user_update_002';
    const newTimezone = 'Europe/Moscow';
    const newPhoneCode = '8';
    // step 1: create user
    const name = 'test_user_update_001';
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, name, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: update
    const query3: InjectOptions = getUserUpdateQuery({
      cookie: cookie1,
      name: newName,
      timezone: newTimezone,
      phoneCode: newPhoneCode,
      userId,
    });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(200);
    expect(payload3.status).toEqual('ok');
    // step 4: getOne
    const query4: InjectOptions = getUserGetOneQuery({ cookie: cookie1, userId: userId.toString() });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    expect(result4.statusCode).toEqual(200);
    expect(payload4.status).toEqual('ok');
    expect(payload4.data.name).toEqual(newName);
    expect(payload4.data.phone).toEqual(phone);
    expect(payload4.data.timezone).toEqual(newTimezone);
    expect(payload4.data.config.phoneCode).toEqual(newPhoneCode);
  });

  it('/user/update (POST) ok missing fileMimetype full fileContent', async () => {
    const newName = 'test_user_update_002';
    const newTimezone = 'Europe/Moscow';
    const newPhoneCode = '8';
    // step 1: create user
    const name = 'test_user_update_001';
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, name, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: update
    const query3: InjectOptions = getUserUpdateQuery({
      cookie: cookie1,
      name: newName,
      timezone: newTimezone,
      phoneCode: newPhoneCode,
      userId,
      isIconFile: true,
      fileExtension,
      fileName,
      fileContent,
    });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(200);
    expect(payload3.status).toEqual('ok');
    expect(payload3.data.uploadedFileId).not.toBeNaN();
    // step 4: getOne
    const query4: InjectOptions = getUserGetOneQuery({ cookie: cookie1, userId: userId.toString() });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    expect(payload4.data.iconFileId).toEqual(payload3.data.uploadedFileId);
    expect(payload4.data.name).toEqual(newName);
    expect(payload4.data.phone).toEqual(phone);
    expect(payload4.data.timezone).toEqual(newTimezone);
    expect(payload4.data.config.phoneCode).toEqual(newPhoneCode);
  });

  it('/user/update (POST) ok iconFile: null', async () => {
    // тест удаления ссылки на иконку (через указание в запросе iconFile: null)
    // step 1: create user
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: update
    const query3: InjectOptions = getUserUpdateQuery({
      cookie: cookie1,
      userId,
      isIconFile: true,
      fileExtension,
      fileName,
      fileMimetype,
      fileContent,
    });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(200);
    expect(payload3.status).toEqual('ok');
    expect(payload3.data.uploadedFileId).not.toBeNaN();
    // step 4: update#2 to delete icon file
    const query4: InjectOptions = getUserUpdateQuery({
      cookie: cookie1,
      userId,
      isIconFileNull: true,
    });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    expect(result4.statusCode).toEqual(200);
    expect(payload4.status).toEqual('ok');
    expect(payload4.data.uploadedFileId).not.toBeNaN();
    // step 5: getOne
    const query5: InjectOptions = getUserGetOneQuery({ cookie: cookie1, userId: userId.toString() });
    const result5 = await app.inject(query5);
    const payload5 = JSON.parse(result5.payload);
    expect(payload5.data.iconFileId).toEqual(null);
  });

  it('/user/update (POST) err change phone', async () => {
    const newPhone = getPhone();
    // step 1: create user
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: update
    const query3: InjectOptions = getUserUpdateQuery({
      cookie: cookie1,
      phone: newPhone,
      userId,
    });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(400);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual('/user/update');
    expect(payload3.msg).toEqual('Access denied to change phone number');
  });

  it('/user/update (POST) err change another user', async () => {
    // user try change anothe user
    const newName = 'test_user_update_004';
    // step 1: create user
    const phone = getPhone();
    const name = 'test_user_update_003';
    const { cookie: cookie1 } = await createOrGetUser({ phone, name, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // user#1 is created, userId is user#1 id

    // step 3: create user
    const phone3 = getPhone();
    // phone3 is user#2 phone
    const { cookie: cookie3 } = await createOrGetUser({ phone: phone3, app });
    // user#2 is created, cookie5 is user#2 cookie
    // step 4: update
    const query4: InjectOptions = getUserUpdateQuery({
      cookie: cookie3,
      name: newName,
      userId,
    });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    // TODO: update after fix
    expect(result4.statusCode).toEqual(200);
  });

  it('/user/update (POST) err bad cookie', async () => {
    const badCookie = 'qqq';
    const newTimezone = 'Europe/Moscow';
    const newPhoneCode = '8';
    // step 1: create user
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: update
    const query3: InjectOptions = getUserUpdateQuery({
      cookie: badCookie,
      timezone: newTimezone,
      phoneCode: newPhoneCode,
      userId,
    });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(403);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual('/user/update');
    expect(payload3.msg).toEqual('Access denied (login first)');
    expect(payload3.code).toEqual('NEED_LOGIN');
  });

  it('/user/update (POST) err missing cookie', async () => {
    const newTimezone = 'Europe/Moscow';
    const newPhoneCode = '8';
    // step 1: create user
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: update
    const query3: InjectOptions = getUserUpdateQuery({
      timezone: newTimezone,
      phoneCode: newPhoneCode,
      userId,
    });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(403);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual('/user/update');
    expect(payload3.msg).toEqual('Access denied (login first)');
    expect(payload3.code).toEqual('NEED_LOGIN');
  });

  it('/user/update (POST) err empty fileContent', async () => {
    const newTimezone = 'Europe/Moscow';
    const newPhoneCode = '8';
    // step 1: create user
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: update
    const query3: InjectOptions = getUserUpdateQuery({
      cookie: cookie1,
      timezone: newTimezone,
      phoneCode: newPhoneCode,
      userId,
      isIconFile: true,
      fileExtension,
      fileName,
      fileMimetype,
      fileContent: '',
    });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(400);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual('/user/update');
    expect(payload3.msg).toEqual('File content is empty');
  });

  it('/user/update (POST) err missing fileMimetype short fileContent', async () => {
    const newTimezone = 'Europe/Moscow';
    const newPhoneCode = '8';
    // step 1: create user
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: update
    const query3: InjectOptions = getUserUpdateQuery({
      cookie: cookie1,
      timezone: newTimezone,
      phoneCode: newPhoneCode,
      userId,
      isIconFile: true,
      fileExtension,
      fileName,
      fileContent: fileData,
    });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(400);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual('/user/update');
    expect(payload3.msg).toEqual('File mime-type is empty');
  });

  // TODO: check after file cloud implementaion
  // it('/user/update (POST) err missing fileName missing fileExtension', async () => {
  //   // step 1: auth
  //   const name = 'test_user_update_001';
  //   const phone = getPhone();
  //   const newName = 'test_user_update_002';
  //   const newTimezone = 'Europe/Moscow';
  //   const newPhoneCode = '8';
  //   const query1: InjectOptions = getUserAuthQuery({ phone, name });
  //   const result1 = await app.inject(query1);
  //   const cookie1 = result1.headers['set-cookie'].toString();
  //   const payload1 = JSON.parse(result1.payload);
  //   // step 2: code
  //   const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
  //   const result2 = await app.inject(query2);
  //   const cookie2 = result2.headers['set-cookie'].toString();
  //   // step 3: session
  //   const query3: InjectOptions = getUserSessionQuery({ cookie: cookie2 });
  //   const result3 = await app.inject(query3);
  //   const payload3 = JSON.parse(result3.payload);
  //   const userId = payload3.data.userId;
  //   // step 4: update
  //   const query4: InjectOptions = getUserUpdateQuery({
  //     cookie: cookie2,
  //     name: newName,
  //     timezone: newTimezone,
  //     phoneCode: newPhoneCode,
  //     userId,
  //     isIconFile: true,
  //     fileMimetype,
  //     fileContent,
  //   });
  //   const result4 = await app.inject(query4);
  //   const payload4 = JSON.parse(result4.payload);
  //   expect(result4.statusCode).toEqual(200);
  //   expect(payload4.status).toEqual('ok');
  // });
});
