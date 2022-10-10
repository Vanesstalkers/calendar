import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createOrGetUser, prepareApp } from './../helpers/prepare';
import { InjectOptions } from 'light-my-request';
import { getUserChangeCurrentProjectQuery, getUserGetOneQuery, getUserSessionQuery } from './../helpers/queryBuilders';
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
    // step 1: create user
    const name = 'test_user_change_current_project_001';
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, name, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: getOne
    const query3: InjectOptions = getUserGetOneQuery({ cookie: cookie1, userId: userId.toString() });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    const newCurrentProject = payload3.data.projectList.find(
      (p) => p.projectId !== payload3.data.config.currentProjectId,
    );
    // step 4: changeCurrentProject
    const query4: InjectOptions = getUserChangeCurrentProjectQuery({
      cookie: cookie1,
      projectId: newCurrentProject.projectId.toString(),
    });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    expect(result4.statusCode).toEqual(200);
    expect(payload4.data.projectToUserLinkId).toEqual(newCurrentProject.projectToUserLinkId);
    expect(payload4.data.projectId).toEqual(newCurrentProject.projectId);
    expect(payload4.data.role).toEqual(newCurrentProject.role);
    expect(payload4.data.position).toEqual(newCurrentProject.position);
    expect(payload4.data.personal).toEqual(newCurrentProject.personal);
    expect(payload4.data.userName).toEqual(null);
    expect(payload4.data.userIconFileId).toEqual(newCurrentProject.userIconFileId);
    expect(payload4.data.config.fake).toEqual(newCurrentProject.config.fake);
    expect(payload4.data.config.scheduleFilters).toEqual(newCurrentProject.config.scheduleFilters);
    expect(payload4.data.projectIconFileId).toEqual(newCurrentProject.projectIconFileId);
  });

  it('/user/changeCurrentProject (POST) ok same projectId', async () => {
    // step 1: create user
    const name = 'test_user_change_current_project_002';
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, name, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: getOne
    const query3: InjectOptions = getUserGetOneQuery({ cookie: cookie1, userId: userId.toString() });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    const newCurrentProject = payload3.data.projectList.find(
      (p) => p.projectId === payload3.data.config.currentProjectId,
    );
    // step 4: changeCurrentProject
    const query4: InjectOptions = getUserChangeCurrentProjectQuery({
      cookie: cookie1,
      projectId: newCurrentProject.projectId.toString(),
    });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    expect(result4.statusCode).toEqual(200);
    expect(payload4.data.projectToUserLinkId).toEqual(newCurrentProject.projectToUserLinkId);
    expect(payload4.data.projectId).toEqual(newCurrentProject.projectId);
    expect(payload4.data.role).toEqual(newCurrentProject.role);
    expect(payload4.data.position).toEqual(newCurrentProject.position);
    expect(payload4.data.personal).toEqual(newCurrentProject.personal);
    expect(payload4.data.userName).toEqual(null);
    expect(payload4.data.userIconFileId).toEqual(newCurrentProject.userIconFileId);
    expect(payload4.data.config.fake).toEqual(newCurrentProject.config.fake);
    expect(payload4.data.config.scheduleFilters).toEqual(newCurrentProject.config.scheduleFilters);
    expect(payload4.data.projectIconFileId).toEqual(newCurrentProject.projectIconFileId);
  });

  it('/user/changeCurrentProject (POST) err bad projectId 1', async () => {
    const badProjectId = 'qqq';
    // step 1: create user
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 2: changeCurrentProject
    const query2: InjectOptions = getUserChangeCurrentProjectQuery({
      cookie: cookie1,
      projectId: badProjectId,
    });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(400);
    expect(payload2.status).toEqual('err');
    expect(payload2.timestamp).toBeDefined();
    expect(payload2.path).toEqual(`/user/changeCurrentProject?projectId=${badProjectId}`);
    expect(payload2.msg).toEqual('Project ID is empty');
  });

  it('/user/changeCurrentProject (POST) err bad projectId 2', async () => {
    const badProjectId = '999999999';
    // step 1: create user
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 3: changeCurrentProject
    const query2: InjectOptions = getUserChangeCurrentProjectQuery({
      cookie: cookie1,
      projectId: badProjectId,
    });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(400);
    expect(payload2.status).toEqual('err');
    expect(payload2.timestamp).toBeDefined();
    expect(payload2.path).toEqual(`/user/changeCurrentProject?projectId=${badProjectId}`);
    expect(payload2.msg).toEqual(`Project (id=${badProjectId}) not exist`);
  });

  it('/user/changeCurrentProject (POST) err bad projectId 3', async () => {
    // try to chamge to project belong to another user
    // step 1: create user 1
    const phone1 = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone: phone1, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: getOne
    const query3: InjectOptions = getUserGetOneQuery({ cookie: cookie1, userId: userId.toString() });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    const newCurrentProject = payload3.data.projectList.find(
      (p) => p.projectId !== payload3.data.config.currentProjectId,
    );
    // step 4: create user 2
    const phone4 = getPhone();
    const { cookie: cookie4 } = await createOrGetUser({ phone: phone4, app });
    // step 5: changeCurrentProject
    const query5: InjectOptions = getUserChangeCurrentProjectQuery({
      cookie: cookie4,
      projectId: newCurrentProject.projectId.toString(),
    });
    const result5 = await app.inject(query5);
    const payload5 = JSON.parse(result5.payload);
    expect(result5.statusCode).toEqual(400);
    expect(payload5.status).toEqual('err');
    expect(payload5.timestamp).toBeDefined();
    expect(payload5.path).toEqual(`/user/changeCurrentProject?projectId=${newCurrentProject.projectId}`);
    expect(payload5.msg).toContain('User (id=');
    expect(payload5.msg).toContain(`) is not a member of project (id=${newCurrentProject.projectId})`);
  });

  it('/user/changeCurrentProject (POST) err missing projectId', async () => {
    // step 1: create user
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 2: changeCurrentProject
    const query2: InjectOptions = getUserChangeCurrentProjectQuery({
      cookie: cookie1,
    });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(400);
    expect(payload2.status).toEqual('err');
    expect(payload2.timestamp).toBeDefined();
    expect(payload2.path).toEqual('/user/changeCurrentProject');
    expect(payload2.msg).toEqual('Project ID is empty');
  });

  it('/user/changeCurrentProject (POST) err bad cookie', async () => {
    const badCookie = 'qqq';
    // step 1: create user
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: getOne
    const query3: InjectOptions = getUserGetOneQuery({ cookie: cookie1, userId: userId.toString() });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    const newCurrentProject = payload3.data.projectList.find(
      (p) => p.projectId !== payload3.data.config.currentProjectId,
    );
    // step 4: changeCurrentProject
    const query4: InjectOptions = getUserChangeCurrentProjectQuery({
      cookie: badCookie,
      projectId: newCurrentProject.projectId.toString(),
    });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    expect(result4.statusCode).toEqual(403);
    expect(payload4.status).toEqual('err');
    expect(payload4.timestamp).toBeDefined();
    expect(payload4.path).toEqual(`/user/changeCurrentProject?projectId=${newCurrentProject.projectId}`);
    expect(payload4.msg).toEqual('Access denied (login first)');
    expect(payload4.code).toEqual('NEED_LOGIN');
  });

  it('/user/changeCurrentProject (POST) err missing cookie', async () => {
    // step 1: create user
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: getOne
    const query3: InjectOptions = getUserGetOneQuery({ cookie: cookie1, userId: userId.toString() });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    const newCurrentProject = payload3.data.projectList.find(
      (p) => p.projectId !== payload3.data.config.currentProjectId,
    );
    // step 4: changeCurrentProject
    const query4: InjectOptions = getUserChangeCurrentProjectQuery({
      projectId: newCurrentProject.projectId.toString(),
    });
    const result4 = await app.inject(query4);
    const payload4 = JSON.parse(result4.payload);
    expect(result4.statusCode).toEqual(403);
    expect(payload4.status).toEqual('err');
    expect(payload4.timestamp).toBeDefined();
    expect(payload4.path).toEqual(`/user/changeCurrentProject?projectId=${newCurrentProject.projectId}`);
    expect(payload4.msg).toEqual('Access denied (login first)');
    expect(payload4.code).toEqual('NEED_LOGIN');
  });
});
