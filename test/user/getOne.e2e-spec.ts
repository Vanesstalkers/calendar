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
  getUserSessionQuery,
} from './../helpers/queryBuilders';
import { phones } from './../helpers/constants.json';

const phonesList = phones.slice(11, 20);
function getPhone() {
  return phonesList.shift();
}

describe('UserController /user/getOne (e2e)', () => {
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

  it('/user/getOne (GET) ok register', async () => {
    // step 1: auth
    const name = 'test_user_name_001';
    const phone = getPhone();
    const timezone = 'America/Montreal';
    const phoneCode = '1';
    const query1: InjectOptions = getUserAuthQuery({ phone, name, timezone, phoneCode });
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
    // step 4: getOne
    const query4: InjectOptions = getUserGetOneQuery({ cookie: cookie2, userId: userId.toString() });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    expect(result4.statusCode).toEqual(200);
    expect(payload4.status).toEqual('ok');
    expect(payload4.data.id).toEqual(userId);
    expect(payload4.data.name).toEqual(name);
    expect(payload4.data.phone).toEqual(phone);
    expect(payload4.data.timezone).toEqual(timezone);
    expect(payload4.data.config.fake).toEqual(true);
    expect(payload4.data.config.phoneCode).toEqual(phoneCode);
    expect(payload4.data.config.sessionStorageId).toBeDefined();
    expect(payload4.data.config.currentProjectId).not.toBeNaN();
    expect(payload4.data.config.personalProjectId).not.toBeNaN();
    expect(payload4.data.config.personalProjectId).toEqual(payload4.data.config.currentProjectId);
    expect(payload4.data.projectList instanceof Array).toEqual(true);
    expect(payload4.data.projectList.length).toEqual(2);
    for (let index = 0; index < payload4.data.projectList.length; index++) {
      const project = payload4.data.projectList[index];
      expect(project.projectToUserLinkId).not.toBeNaN();
      expect(project.userId).toEqual(userId);
      expect(project.projectId).not.toBeNaN();
      const personal = project.projectId === payload4.data.config.personalProjectId;
      expect(project.role).toEqual('owner');
      expect(project.position).toEqual('');
      expect(project.personal).toEqual(personal);
      expect(project.userName).toEqual(null);
      expect(project.userIconFileId).toEqual(null);
      expect(project.config.fake).toEqual(true);
      expect(project.config.scheduleFilters).toEqual(null);
      expect(project.title).toEqual(`${userId}th user's ${personal ? 'personal' : 'work'} project`);
      expect(project.projectIconFileId).toEqual(null);
    }
    expect(payload4.data.iconFileId).toEqual(null);
    expect(payload4.data.contactList instanceof Array).toEqual(true);
    expect(payload4.data.contactList.length).toEqual(0);
  });

  it('/user/getOne (GET) ok login', async () => {
    // registration -> logout -> login -> getOne
    // step 1: auth
    const name = 'test_user_name_002';
    const phone = getPhone();
    const timezone = 'Europe/Minsk';
    const phoneCode = '375';
    const query1: InjectOptions = getUserAuthQuery({ phone, name, timezone, phoneCode });
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
    const query4: InjectOptions = getUserAuthQuery({ phone });
    const result4 = await app.inject(query4);
    const cookie4 = result4.headers['set-cookie'].toString();
    const payload4 = JSON.parse(result4.payload);
    // step 5: code
    const query5: InjectOptions = getUserCodeQuery({ code: payload4.data.code, cookie: cookie4 });
    const result5 = await app.inject(query5);
    const cookie5 = result5.headers['set-cookie'].toString();
    // step 6: session
    const query6: InjectOptions = getUserSessionQuery({ cookie: cookie5 });
    const result6 = await app.inject(query6);
    const payload6 = JSON.parse(result6.payload);
    const userId = payload6.data.userId;
    // step 7: getOne
    const query7: InjectOptions = getUserGetOneQuery({ cookie: cookie5, userId: userId.toString() });
    const result7 = await app.inject(query7);
    const payload7 = JSON.parse(result7.payload);
    expect(result7.statusCode).toEqual(200);
    expect(payload7.status).toEqual('ok');
    expect(payload7.data.id).toEqual(userId);
    expect(payload7.data.name).toEqual(name);
    expect(payload7.data.phone).toEqual(phone);
    expect(payload7.data.timezone).toEqual(timezone);
    expect(payload7.data.config.fake).toEqual(true);
    expect(payload7.data.config.phoneCode).toEqual(phoneCode);
    expect(payload7.data.config.sessionStorageId).toBeDefined();
    expect(payload7.data.config.currentProjectId).not.toBeNaN();
    expect(payload7.data.config.personalProjectId).not.toBeNaN();
    expect(payload7.data.config.personalProjectId).toEqual(payload7.data.config.currentProjectId);
    expect(payload7.data.projectList instanceof Array).toEqual(true);
    expect(payload7.data.projectList.length).toEqual(2);
    for (let index = 0; index < payload7.data.projectList.length; index++) {
      const project = payload7.data.projectList[index];
      expect(project.projectToUserLinkId).not.toBeNaN();
      expect(project.userId).toEqual(userId);
      expect(project.projectId).not.toBeNaN();
      const personal = project.projectId === payload7.data.config.personalProjectId;
      expect(project.role).toEqual('owner');
      expect(project.position).toEqual('');
      expect(project.personal).toEqual(personal);
      expect(project.userName).toEqual(null);
      expect(project.userIconFileId).toEqual(null);
      expect(project.config.fake).toEqual(true);
      expect(project.config.scheduleFilters).toEqual(null);
      expect(project.title).toEqual(`${userId}th user's ${personal ? 'personal' : 'work'} project`);
      expect(project.projectIconFileId).toEqual(null);
    }
    expect(payload7.data.iconFileId).toEqual(null);
    expect(payload7.data.contactList instanceof Array).toEqual(true);
    expect(payload7.data.contactList.length).toEqual(0);
  });

  it('/user/getOne (GET) ok bad userId 1', async () => {
    // step 1: auth
    const name = 'test_user_name_111';
    const phone = getPhone();
    const timezone = 'America/Montreal';
    const phoneCode = '1';
    const query1: InjectOptions = getUserAuthQuery({ phone, name, timezone, phoneCode });
    const result1 = await app.inject(query1);
    const cookie1 = result1.headers['set-cookie'].toString();
    const payload1 = JSON.parse(result1.payload);
    // step 2: code
    const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
    const result2 = await app.inject(query2);
    const cookie2 = result2.headers['set-cookie'].toString();
    const userId = 999999999; //no idea here how to do 100% bad one. should be good now for any test env
    // step 3: getOne
    const query3: InjectOptions = getUserGetOneQuery({ cookie: cookie2, userId: userId.toString() });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(200);
    expect(payload3.status).toEqual('ok');
    expect(payload3.data).toEqual(null);
  });

  it('/user/getOne (GET) err bad userId 2', async () => {
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
    const userId = 1e12;
    // step 3: getOne
    const query3: InjectOptions = getUserGetOneQuery({ cookie: cookie2, userId: userId.toString() });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(400);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual(`/user/getOne?userId=${userId}`);
    expect(payload3.msg).toEqual(`value "${userId}" is out of range for type integer`);
    expect(payload3.code).toEqual('DB_BAD_QUERY');
  });

  it('/user/getOne (GET) err bad userId 3', async () => {
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
    const userId = 'qwe'; //no idea here how to do 100% bad one. should be good now for any test env
    // step 3: getOne
    const query3: InjectOptions = getUserGetOneQuery({ cookie: cookie2, userId: userId.toString() });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(400);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual(`/user/getOne?userId=${userId}`);
    expect(payload3.msg).toEqual(`invalid input syntax for type integer: "${userId}"`);
    expect(payload3.code).toEqual('DB_BAD_QUERY');
  });

  it('/user/getOne (GET) err missing userId', async () => {
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
    // step 3: getOne
    const query3: InjectOptions = getUserGetOneQuery({ cookie: cookie2 });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(400);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual(`/user/getOne`);
    expect(payload3.msg).toEqual('User ID is empty');
  });

  it('/user/getOne (GET) err bad cookie', async () => {
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
    // step 3: session
    const query3: InjectOptions = getUserSessionQuery({ cookie: cookie2 });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    const userId = payload3.data.userId;
    // step 4: getOne
    const query4: InjectOptions = getUserGetOneQuery({ cookie: 'qwe', userId: userId.toString() });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    expect(result4.statusCode).toEqual(403);
    expect(payload4.status).toEqual('err');
    expect(payload4.timestamp).toBeDefined();
    expect(payload4.path).toEqual(`/user/getOne?userId=${userId}`);
    expect(payload4.msg).toEqual('Access denied (login first)');
    expect(payload4.code).toEqual('NEED_LOGIN');
  });

  it('/user/getOne (GET) err missing cookie', async () => {
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
    // step 3: session
    const query3: InjectOptions = getUserSessionQuery({ cookie: cookie2 });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    const userId = payload3.data.userId;
    // step 4: getOne
    const query4: InjectOptions = getUserGetOneQuery({ userId: userId.toString() });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    expect(result4.statusCode).toEqual(403);
    expect(payload4.status).toEqual('err');
    expect(payload4.timestamp).toBeDefined();
    expect(payload4.path).toEqual(`/user/getOne?userId=${userId}`);
    expect(payload4.msg).toEqual('Access denied (login first)');
    expect(payload4.code).toEqual('NEED_LOGIN');
  });
});
