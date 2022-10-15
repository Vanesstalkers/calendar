import { Test, TestingModule } from '@nestjs/testing';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './../../src/app.module';
import { createOrGetUser, prepareApp } from './../helpers/prepare';
import { InjectOptions } from 'light-my-request';
import { getProjectCreateQuery, getUserSessionQuery } from './../helpers/queryBuilders';
import { phones } from './../helpers/constants.json';

const phonesList = phones.slice(110, 120);
function getPhone() {
  return phonesList.shift();
}

describe('ProjectController /project/create (e2e)', () => {
  let app: NestFastifyApplication;
  let moduleFixture: TestingModule;
  let sharedCookie: string;
  let sharedUserId: number;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await prepareApp(moduleFixture);

    // create shared user
    const phone = getPhone();
    const createOrGetUserResult = await createOrGetUser({ phone, app });
    sharedCookie = createOrGetUserResult.cookie;
    const query: InjectOptions = getUserSessionQuery({ cookie: sharedCookie });
    const result = await app.inject(query);
    const payload = JSON.parse(result.payload);
    sharedUserId = payload.data.userId;
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });

  it('/project/create (POST) ok', async () => {
    const title = 'test_project_name_project_create_001';
    const role = 'owner';
    const userName = 'test_user_name_project_create_001';
    const position = 'test_position_001';
    const config = {};
    // step 1: create project
    const query1: InjectOptions = getProjectCreateQuery({
      cookie: sharedCookie,
      title,
      userId: sharedUserId,
      role,
      userName,
      position,
      config,
    });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(200);
    expect(payload1.status).toEqual('ok');
    expect(payload1.data.id).not.toBeNaN();
    expect(payload1.traceId).toBeDefined();
  });

  it('/project/create (POST) ok missing title, role, userName, position, config', async () => {
    // step 1: create project
    const query1: InjectOptions = getProjectCreateQuery({
      cookie: sharedCookie,
      title: null,
      userId: sharedUserId,
      role: null,
      userName: null,
      position: null,
      config: null,
    });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(200);
    expect(payload1.status).toEqual('ok');
    expect(payload1.data.id).not.toBeNaN();
    expect(payload1.traceId).toBeDefined();
  });

  it('/project/create (POST) ok another userId', async () => {
    // create project for another user
    // step 1: create user
    const phone = getPhone();
    const { cookie: cookie1 } = await createOrGetUser({ phone, app });
    // step 2: session
    const query2: InjectOptions = getUserSessionQuery({ cookie: cookie1 });
    const result2 = await app.inject(query2);
    const payload2 = JSON.parse(result2.payload);
    const userId = payload2.data.userId;
    // step 3: create project
    const query3: InjectOptions = getProjectCreateQuery({
      cookie: sharedCookie,
      userId: userId,
    });
    const result3 = await app.inject(query3);
    const payload3 = JSON.parse(result3.payload);
    expect(result3.statusCode).toEqual(200);
    expect(payload3.status).toEqual('ok');
    expect(payload3.data.id).not.toBeNaN();
    expect(payload3.traceId).toBeDefined();
    // need fix?
  });

  it('/project/create (POST) err bad cookie', async () => {
    const badCookie = 'qqqqqqqqqqqq';
    // step 1: create project
    const query1: InjectOptions = getProjectCreateQuery({
      cookie: badCookie,
      userId: sharedUserId,
    });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(403);
    expect(payload1.status).toEqual('err');
    expect(payload1.timestamp).toBeDefined();
    expect(payload1.path).toEqual('/project/create');
    expect(payload1.msg).toEqual('Access denied (login first)');
    expect(payload1.code).toEqual('NEED_LOGIN');
  });

  it('/project/create (POST) err missing cookie', async () => {
    // step 1: create project
    const query1: InjectOptions = getProjectCreateQuery({
      userId: sharedUserId,
    });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(403);
    expect(payload1.status).toEqual('err');
    expect(payload1.timestamp).toBeDefined();
    expect(payload1.path).toEqual('/project/create');
    expect(payload1.msg).toEqual('Access denied (login first)');
    expect(payload1.code).toEqual('NEED_LOGIN');
  });

  it('/project/create (POST) err bad userId', async () => {
    const badUserId = 'qqqqqqqq';
    // step 1: create project
    const query1: InjectOptions = getProjectCreateQuery({
      cookie: sharedCookie,
      userId: badUserId,
    });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(400);
    expect(payload1.status).toEqual('err');
    expect(payload1.timestamp).toBeDefined();
    expect(payload1.path).toEqual('/project/create');
    expect(payload1.msg).toEqual(`invalid input syntax for type integer: "${badUserId}"`);
    expect(payload1.code).toEqual('DB_BAD_QUERY');
  });

  it('/project/create (POST) err missing userId', async () => {
    // step 1: create project
    const query1: InjectOptions = getProjectCreateQuery({
      cookie: sharedCookie,
      userId: null,
    });
    const result1 = await app.inject(query1);
    const payload1 = JSON.parse(result1.payload);
    expect(result1.statusCode).toEqual(500);
    expect(payload1.status).toEqual('err');
    expect(payload1.timestamp).toBeDefined();
    expect(payload1.path).toEqual('/project/create');
  });
});
