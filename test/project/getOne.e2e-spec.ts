import { Test, TestingModule } from '@nestjs/testing';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './../../src/app.module';
import { createOrGetUser, createProject, prepareApp } from './../helpers/prepare';
import { InjectOptions } from 'light-my-request';
import { getProjectGetOneQuery } from './../helpers/queryBuilders';
import { phones } from './../helpers/constants.json';

const phonesList = phones.slice(120, 130);
function getPhone() {
  return phonesList.shift();
}

describe('ProjectController /project/getOne (e2e)', () => {
  let app: NestFastifyApplication;
  let moduleFixture: TestingModule;
  let sharedCookie: string;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await prepareApp(moduleFixture);
    // create shared user
    const phone = getPhone();
    const createOrGetUserResult = await createOrGetUser({ phone, app });
    sharedCookie = createOrGetUserResult.cookie;
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });

  it('/project/getOne (GET) ok', async () => {
    const title = 'test_project_name_project_getOne_001';
    const role = 'owner';
    const userName = 'test_user_name_project_getOne_001';
    const position = 'test_position_getOne_001';
    const config = {};
    // step 1: create project
    const { projectId, userId } = await createProject({
      cookie: sharedCookie,
      title,
      role,
      userName,
      position,
      config,
      app,
    });
    // step 2: getOne
    const query2: InjectOptions = getProjectGetOneQuery({ cookie: sharedCookie, projectId });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    expect(result2.statusCode).toEqual(200);
    expect(payload2.status).toEqual('ok');
    expect(payload2.traceId).toBeDefined();
    expect(payload2.data.id).not.toBeNaN();
    expect(payload2.data.title).toEqual(title);
    expect(payload2.data.personal).toEqual(false);
    expect(payload2.data.config.fake).toEqual(true);
    expect(payload2.data.config.iconFileId).toEqual(null);
    expect(payload2.data.iconFileId).toEqual(null);
    expect(payload2.data.userList instanceof Array).toEqual(true);
    expect(payload2.data.userList.length).toEqual(1);
    expect(payload2.data.userList[0].projectToUserLinkId).not.toBeNaN();
    expect(payload2.data.userList[0].userId).toEqual(userId);
    expect(payload2.data.userList[0].projectId).toEqual(projectId);
    expect(payload2.data.userList[0].role).toEqual(role);
    expect(payload2.data.userList[0].position).toEqual(position);
    expect(payload2.data.userList[0].personal).toEqual(false);
    expect(payload2.data.userList[0].userName).toEqual(userName);
    expect(payload2.data.userList[0].userIconFileId).toEqual(null);
    expect(payload2.data.userList[0].config.fake).toEqual(true);
    expect(payload2.data.userList[0].config.userIconFileId).toEqual(null);
    expect(payload2.data.userList[0].config.scheduleFilters).toEqual(null);
  });
  // TODO: err cases
});
