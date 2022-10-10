import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createOrGetUser, prepareApp } from './../helpers/prepare';
import { InjectOptions } from 'light-my-request';
import { getUserGetOneQuery, getUserLogoutQuery, getUserSessionQuery } from './../helpers/queryBuilders';
import { phones } from './../helpers/constants.json';

const phonesList = phones.slice(10, 20);
function getPhone() {
  return phonesList.shift();
}

describe('UserController /user/getOne (e2e)', () => {
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

  it('/user/getOne (GET) ok register same user', async () => {
    // step 1: create user
    const name = 'test_user_get_one_001';
    const phone = getPhone();
    const timezone = 'America/Montreal';
    const phoneCode = '1';
    const { cookie: cookie1 } = await createOrGetUser({ phone, name, timezone, phoneCode, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: getOne
    const query3: InjectOptions = getUserGetOneQuery({ cookie: cookie1, userId: userId.toString() });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(200);
    expect(payload3.status).toEqual('ok');
    expect(payload3.data.id).toEqual(userId);
    expect(payload3.data.name).toEqual(name);
    expect(payload3.data.phone).toEqual(phone);
    expect(payload3.data.timezone).toEqual(timezone);
    expect(payload3.data.config.fake).toEqual(true);
    expect(payload3.data.config.phoneCode).toEqual(phoneCode);
    expect(payload3.data.config.currentProjectId).not.toBeNaN();
    expect(payload3.data.config.personalProjectId).not.toBeNaN();
    expect(payload3.data.config.personalProjectId).toEqual(payload3.data.config.currentProjectId);
    expect(payload3.data.projectList instanceof Array).toEqual(true);
    expect(payload3.data.projectList.length).toEqual(2);
    for (let index = 0; index < payload3.data.projectList.length; index++) {
      const project = payload3.data.projectList[index];
      expect(project.projectToUserLinkId).not.toBeNaN();
      expect(project.userId).toEqual(userId);
      expect(project.projectId).not.toBeNaN();
      const personal = project.projectId === payload3.data.config.personalProjectId;
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
    expect(payload3.data.iconFileId).toEqual(null);
    expect(payload3.data.contactList instanceof Array).toEqual(true);
    expect(payload3.data.contactList.length).toEqual(0);
  });

  it('/user/getOne (GET) ok login same user', async () => {
    // registration -> logout -> login -> getOne
    // step 1: create user
    const name = 'test_user_get_one_002';
    const phone = getPhone();
    const timezone = 'Europe/Minsk';
    const phoneCode = '375';
    const { cookie: cookie1 } = await createOrGetUser({ phone, name, timezone, phoneCode, app });
    // step 2: logout
    const query2: InjectOptions = getUserLogoutQuery({ cookie: cookie1 });
    await app.inject(query2);
    // step 3: login
    const { cookie: cookie3 } = await createOrGetUser({ phone, app });
    // step 4: session
    const query4: InjectOptions = getUserSessionQuery({ cookie: cookie3 });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    const userId = payload4.data.userId;
    // step 5: getOne
    const query5: InjectOptions = getUserGetOneQuery({ cookie: cookie3, userId: userId.toString() });
    const result5 = await app.inject(query5);
    const payload5 = JSON.parse(result5.payload);
    expect(result5.statusCode).toEqual(200);
    expect(payload5.status).toEqual('ok');
    expect(payload5.data.id).toEqual(userId);
    expect(payload5.data.name).toEqual(name);
    expect(payload5.data.phone).toEqual(phone);
    expect(payload5.data.timezone).toEqual(timezone);
    expect(payload5.data.config.fake).toEqual(true);
    expect(payload5.data.config.phoneCode).toEqual(phoneCode);
    expect(payload5.data.config.currentProjectId).not.toBeNaN();
    expect(payload5.data.config.personalProjectId).not.toBeNaN();
    expect(payload5.data.config.personalProjectId).toEqual(payload5.data.config.currentProjectId);
    expect(payload5.data.projectList instanceof Array).toEqual(true);
    expect(payload5.data.projectList.length).toEqual(2);
    for (let index = 0; index < payload5.data.projectList.length; index++) {
      const project = payload5.data.projectList[index];
      expect(project.projectToUserLinkId).not.toBeNaN();
      expect(project.userId).toEqual(userId);
      expect(project.projectId).not.toBeNaN();
      const personal = project.projectId === payload5.data.config.personalProjectId;
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
    expect(payload5.data.iconFileId).toEqual(null);
    expect(payload5.data.contactList instanceof Array).toEqual(true);
    expect(payload5.data.contactList.length).toEqual(0);
  });

  it('/user/getOne (GET) ok register another user', async () => {
    // step 1: create user
    const name = 'test_user_get_one_003';
    const phone = getPhone();
    const timezone = 'Europe/Moscow';
    const phoneCode = '7';
    const { cookie: cookie1 } = await createOrGetUser({ phone, name, timezone, phoneCode, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: getOne
    const query3: InjectOptions = getUserGetOneQuery({ cookie: sharedCookie, userId: userId.toString() });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(200);
    expect(payload3.status).toEqual('ok');
    expect(payload3.data.id).toEqual(userId);
    expect(payload3.data.name).toEqual(name);
    expect(payload3.data.phone).toEqual(phone);
    expect(payload3.data.timezone).toEqual(timezone);
    expect(payload3.data.config.fake).toEqual(true);
    expect(payload3.data.config.phoneCode).toEqual(phoneCode);
    expect(payload3.data.config.currentProjectId).not.toBeNaN();
    expect(payload3.data.config.personalProjectId).not.toBeNaN();
    expect(payload3.data.config.personalProjectId).toEqual(payload3.data.config.currentProjectId);
    expect(payload3.data.projectList instanceof Array).toEqual(true);
    expect(payload3.data.projectList.length).toEqual(2);
    for (let index = 0; index < payload3.data.projectList.length; index++) {
      const project = payload3.data.projectList[index];
      expect(project.projectToUserLinkId).not.toBeNaN();
      expect(project.userId).toEqual(userId);
      expect(project.projectId).not.toBeNaN();
      const personal = project.projectId === payload3.data.config.personalProjectId;
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
    expect(payload3.data.iconFileId).toEqual(null);
    expect(payload3.data.contactList instanceof Array).toEqual(true);
    expect(payload3.data.contactList.length).toEqual(0);
  });

  it('/user/getOne (GET) ok bad userId 1', async () => {
    //no idea here how to do 100% bad one. should be good now for any test env
    const badUserId = '999999999';
    // step 1: getOne
    const query1: InjectOptions = getUserGetOneQuery({ cookie: sharedCookie, userId: badUserId });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(200);
    expect(payload1.status).toEqual('ok');
    expect(payload1.data).toEqual(null);
  });

  it('/user/getOne (GET) err bad userId 2', async () => {
    const badUserId = 1e12;
    // step 1: getOne
    const query1: InjectOptions = getUserGetOneQuery({ cookie: sharedCookie, userId: badUserId.toString() });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(400);
    expect(payload1.status).toEqual('err');
    expect(payload1.timestamp).toBeDefined();
    expect(payload1.path).toEqual(`/user/getOne?userId=${badUserId}`);
    expect(payload1.msg).toEqual(`value "${badUserId}" is out of range for type integer`);
    expect(payload1.code).toEqual('DB_BAD_QUERY');
  });

  it('/user/getOne (GET) err bad userId 3', async () => {
    const badUserId = 'qwe';
    // step 1: getOne
    const query1: InjectOptions = getUserGetOneQuery({ cookie: sharedCookie, userId: badUserId });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(400);
    expect(payload1.status).toEqual('err');
    expect(payload1.timestamp).toBeDefined();
    expect(payload1.path).toEqual(`/user/getOne?userId=${badUserId}`);
    expect(payload1.msg).toEqual(`invalid input syntax for type integer: "${badUserId}"`);
    expect(payload1.code).toEqual('DB_BAD_QUERY');
  });

  it('/user/getOne (GET) err missing userId', async () => {
    // step 1: getOne
    const query1: InjectOptions = getUserGetOneQuery({ cookie: sharedCookie });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(400);
    expect(payload1.status).toEqual('err');
    expect(payload1.timestamp).toBeDefined();
    expect(payload1.path).toEqual(`/user/getOne`);
    expect(payload1.msg).toEqual('User ID is empty');
  });

  it('/user/getOne (GET) err bad cookie', async () => {
    // step 1: auth
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: getOne
    const query3: InjectOptions = getUserGetOneQuery({ cookie: 'qwe', userId: userId.toString() });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(403);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual(`/user/getOne?userId=${userId}`);
    expect(payload3.msg).toEqual('Access denied (login first)');
    expect(payload3.code).toEqual('NEED_LOGIN');
  });

  it('/user/getOne (GET) err missing cookie', async () => {
    // step 1: auth
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: getOne
    const query3: InjectOptions = getUserGetOneQuery({ userId: userId.toString() });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(403);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual(`/user/getOne?userId=${userId}`);
    expect(payload3.msg).toEqual('Access denied (login first)');
    expect(payload3.code).toEqual('NEED_LOGIN');
  });
});
