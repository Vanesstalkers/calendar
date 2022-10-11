import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createOrGetUser, prepareApp } from './../helpers/prepare';
import { InjectOptions } from 'light-my-request';
import { getUserGetOneQuery, getUserSessionQuery, getUserUpdateQuery } from './../helpers/queryBuilders';
import { phones } from './../helpers/constants.json';
import { readFile, stat, unlink, writeFile } from 'fs/promises';

const phonesList = phones.slice(100, 110);
function getPhone() {
  return phonesList.shift();
}

describe('UserController /user/updateWithFormdata (e2e)', () => {
  let app: NestFastifyApplication;
  let moduleFixture: TestingModule;
  let fileData: Buffer;
  const fileExtension = 'png';
  const fileName = `tua2.${fileExtension}`;
  const fileMimetype = `image/${fileExtension}`;
  const link = `./uploads/${fileName}`;
  const sourcePath = `test/assets/tua.png`;
  const destPath = `uploads/${fileName}`;

  async function unlinkIfExists(path: string) {
    try {
      await stat(path);
      await unlink(path);
    } catch (error) {}
  }

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await prepareApp(moduleFixture);
    await unlinkIfExists(destPath);
    fileData = await readFile(sourcePath);
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });

  beforeEach(async () => {
    await writeFile(destPath, fileData);
  });

  afterEach(async () => {
    await unlinkIfExists(destPath);
  });

  it('/user/updateWithFormdata (POST) ok', async () => {
    const newName = 'test_user_update_with_formdata_002';
    const newTimezone = 'Europe/Moscow';
    const newPhoneCode = '8';
    // step 1: create user
    const phone = getPhone();
    const name = 'test_user_update_with_formdata_001';
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
      link,
      withFormdata: true,
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
    expect(payload4.data.iconFileId).toBeGreaterThanOrEqual(0);
  });

  it('/user/updateWithFormdata (POST) err change phone', async () => {
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
      isIconFile: true,
      fileExtension,
      fileName,
      fileMimetype,
      link,
      withFormdata: true,
    });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(400);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual('/user/updateWithFormdata');
    expect(payload3.msg).toEqual('Access denied to change phone number');
  });

  it('/user/updateWithFormdata (POST) err change another user', async () => {
    // user try change anothe user
    const newName = 'test_user_update_004';
    // step 1: create user
    const name = 'test_user_update_003';
    const phone1 = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone: phone1, name, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // user#1 is created, userId is user#1 id
    // step 3: create user
    const phone3 = getPhone();
    const { cookie: cookie3 } = await createOrGetUser({ phone: phone3, app });
    // user#2 is created, cookie3 is user#2 cookie
    // step 4: update
    const query4: InjectOptions = getUserUpdateQuery({
      cookie: cookie3,
      name: newName,
      userId,
      isIconFile: true,
      fileExtension,
      fileName,
      fileMimetype,
      link,
      withFormdata: true,
    });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    // TODO: update after fix
    expect(result4.statusCode).toEqual(200);
  });

  it('/user/updateWithFormdata (POST) err bad cookie', async () => {
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
      isIconFile: true,
      fileExtension,
      fileName,
      fileMimetype,
      link,
      withFormdata: true,
    });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(403);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual('/user/updateWithFormdata');
    expect(payload3.msg).toEqual('Access denied (login first)');
    expect(payload3.code).toEqual('NEED_LOGIN');
  });

  it('/user/updateWithFormdata (POST) err missing cookie', async () => {
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
      isIconFile: true,
      fileExtension,
      fileName,
      fileMimetype,
      link,
      withFormdata: true,
    });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(403);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual('/user/updateWithFormdata');
    expect(payload3.msg).toEqual('Access denied (login first)');
    expect(payload3.code).toEqual('NEED_LOGIN');
  });
});
