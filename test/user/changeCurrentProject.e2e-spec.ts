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
  getUserSessionQuery,
} from './../helpers/queryBuilders';
import { phones } from './../helpers/constants.json';

const phonesList = phones.slice(70, 80);
function getPhone() {
  return phonesList.shift();
}

describe('UserController /user/changeCurrentProject (e2e)', () => {
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

  it('/user/changeCurrentProject (POST) ok', async () => {
    // step 1: auth
    const name = 'test_user_change_current_project_001';
    const phone = getPhone();
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
    // step 4: getOne
    const query4: InjectOptions = getUserGetOneQuery({ cookie: cookie2, userId: userId.toString() });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    const newCurrentProject = payload4.data.projectList.find(
      (p) => p.projectId !== payload4.data.config.currentProjectId,
    );
    // step 5: changeCurrentProject
    const query5: InjectOptions = getUserChangeCurrentProjectQuery({
      cookie: cookie2,
      projectId: newCurrentProject.projectId.toString(),
    });
    const result5 = await app.inject(query5);
    const payload5 = JSON.parse(result5.payload);
    expect(result5.statusCode).toEqual(200);
    expect(payload5.data.projectToUserLinkId).toEqual(newCurrentProject.projectToUserLinkId);
    expect(payload5.data.projectId).toEqual(newCurrentProject.projectId);
    expect(payload5.data.role).toEqual(newCurrentProject.role);
    expect(payload5.data.position).toEqual(newCurrentProject.position);
    expect(payload5.data.personal).toEqual(newCurrentProject.personal);
    expect(payload5.data.userName).toEqual(name);
    expect(payload5.data.userIconFileId).toEqual(newCurrentProject.userIconFileId);
    expect(payload5.data.config.fake).toEqual(newCurrentProject.config.fake);
    expect(payload5.data.config.scheduleFilters).toEqual(newCurrentProject.config.scheduleFilters);
    expect(payload5.data.projectIconFileId).toEqual(newCurrentProject.projectIconFileId);
  });

  it('/user/changeCurrentProject (POST) ok same projectId', async () => {
    // step 1: auth
    const name = 'test_user_change_current_project_002';
    const phone = getPhone();
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
    // step 4: getOne
    const query4: InjectOptions = getUserGetOneQuery({ cookie: cookie2, userId: userId.toString() });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    const newCurrentProject = payload4.data.projectList.find(
      (p) => p.projectId === payload4.data.config.currentProjectId,
    );
    // step 5: changeCurrentProject
    const query5: InjectOptions = getUserChangeCurrentProjectQuery({
      cookie: cookie2,
      projectId: newCurrentProject.projectId.toString(),
    });
    const result5 = await app.inject(query5);
    const payload5 = JSON.parse(result5.payload);
    expect(result5.statusCode).toEqual(200);
    expect(payload5.data.projectToUserLinkId).toEqual(newCurrentProject.projectToUserLinkId);
    expect(payload5.data.projectId).toEqual(newCurrentProject.projectId);
    expect(payload5.data.role).toEqual(newCurrentProject.role);
    expect(payload5.data.position).toEqual(newCurrentProject.position);
    expect(payload5.data.personal).toEqual(newCurrentProject.personal);
    expect(payload5.data.userName).toEqual(name);
    expect(payload5.data.userIconFileId).toEqual(newCurrentProject.userIconFileId);
    expect(payload5.data.config.fake).toEqual(newCurrentProject.config.fake);
    expect(payload5.data.config.scheduleFilters).toEqual(newCurrentProject.config.scheduleFilters);
    expect(payload5.data.projectIconFileId).toEqual(newCurrentProject.projectIconFileId);
  });

  it('/user/changeCurrentProject (POST) err bad projectId 1', async () => {
    const badProjectId = 'qqq';
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
    // step 3: changeCurrentProject
    const query3: InjectOptions = getUserChangeCurrentProjectQuery({
      cookie: cookie2,
      projectId: badProjectId,
    });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(400);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual(`/user/changeCurrentProject?projectId=${badProjectId}`);
    expect(payload3.msg).toEqual('Project ID is empty');
  });

  it('/user/changeCurrentProject (POST) err bad projectId 2', async () => {
    const badProjectId = '999999999';
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
    // step 3: changeCurrentProject
    const query3: InjectOptions = getUserChangeCurrentProjectQuery({
      cookie: cookie2,
      projectId: badProjectId,
    });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(400);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual(`/user/changeCurrentProject?projectId=${badProjectId}`);
    expect(payload3.msg).toEqual(`Project (id=${badProjectId}) not exist`);
  });

  it('/user/changeCurrentProject (POST) err bad projectId 3', async () => {
    // try to chamge to project belong to another user
    // step 1: auth
    const phone1 = getPhone();
    const query1: InjectOptions = getUserAuthQuery({ phone: phone1 });
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
    const newCurrentProject = payload4.data.projectList.find(
      (p) => p.projectId !== payload4.data.config.currentProjectId,
    );
    // step 5: auth
    const phone5 = getPhone();
    const query5: InjectOptions = getUserAuthQuery({ phone: phone5 });
    const result5 = await app.inject(query5);
    const cookie5 = result5.headers['set-cookie'].toString();
    const payload5 = JSON.parse(result5.payload);
    // step 6: code
    const query6: InjectOptions = getUserCodeQuery({ code: payload5.data.code, cookie: cookie5 });
    const result6 = await app.inject(query6);
    const cookie6 = result6.headers['set-cookie'].toString();
    // step 7: changeCurrentProject
    const query7: InjectOptions = getUserChangeCurrentProjectQuery({
      cookie: cookie6,
      projectId: newCurrentProject.projectId.toString(),
    });
    const result7 = await app.inject(query7);
    const payload7 = JSON.parse(result7.payload);
    expect(result7.statusCode).toEqual(400);
    expect(payload7.status).toEqual('err');
    expect(payload7.timestamp).toBeDefined();
    expect(payload7.path).toEqual(`/user/changeCurrentProject?projectId=${newCurrentProject.projectId}`);
    expect(payload7.msg).toContain('User (id=');
    expect(payload7.msg).toContain(`) is not a member of project (id=${newCurrentProject.projectId})`);
  });

  it('/user/changeCurrentProject (POST) err missing projectId', async () => {
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
    // step 3: changeCurrentProject
    const query3: InjectOptions = getUserChangeCurrentProjectQuery({
      cookie: cookie2,
    });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(400);
    expect(payload3.status).toEqual('err');
    expect(payload3.timestamp).toBeDefined();
    expect(payload3.path).toEqual('/user/changeCurrentProject');
    expect(payload3.msg).toEqual('Project ID is empty');
  });

  it('/user/changeCurrentProject (POST) err bad cookie', async () => {
    const badCookie = 'qqq';
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
    const query4: InjectOptions = getUserGetOneQuery({ cookie: cookie2, userId: userId.toString() });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    const newCurrentProject = payload4.data.projectList.find(
      (p) => p.projectId !== payload4.data.config.currentProjectId,
    );
    // step 5: changeCurrentProject
    const query5: InjectOptions = getUserChangeCurrentProjectQuery({
      cookie: badCookie,
      projectId: newCurrentProject.projectId.toString(),
    });
    const result5 = await app.inject(query5);
    const payload5 = JSON.parse(result5.payload);
    expect(result5.statusCode).toEqual(403);
    expect(payload5.status).toEqual('err');
    expect(payload5.timestamp).toBeDefined();
    expect(payload5.path).toEqual(`/user/changeCurrentProject?projectId=${newCurrentProject.projectId}`);
    expect(payload5.msg).toEqual('Access denied (login first)');
    expect(payload5.code).toEqual('NEED_LOGIN');
  });

  it('/user/changeCurrentProject (POST) err missing cookie', async () => {
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
    const query4: InjectOptions = getUserGetOneQuery({ cookie: cookie2, userId: userId.toString() });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    const newCurrentProject = payload4.data.projectList.find(
      (p) => p.projectId !== payload4.data.config.currentProjectId,
    );
    // step 5: changeCurrentProject
    const query5: InjectOptions = getUserChangeCurrentProjectQuery({
      projectId: newCurrentProject.projectId.toString(),
    });
    const result5 = await app.inject(query5);
    const payload5 = JSON.parse(result5.payload);
    expect(result5.statusCode).toEqual(403);
    expect(payload5.status).toEqual('err');
    expect(payload5.timestamp).toBeDefined();
    expect(payload5.path).toEqual(`/user/changeCurrentProject?projectId=${newCurrentProject.projectId}`);
    expect(payload5.msg).toEqual('Access denied (login first)');
    expect(payload5.code).toEqual('NEED_LOGIN');
  });
});
