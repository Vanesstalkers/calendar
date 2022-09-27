import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { prepareApp } from './prepareApp';

describe('UserController (e2e)', () => {
  let app: NestFastifyApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    // app = await bootstrap();
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await prepareApp(moduleFixture);
  });

  it('/user/auth (POST) e', async () => {
    const result = await app.inject({
      method: 'POST',
      url: '/user/auth',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      payload: `{
        "userData": {
          "phone": "1234567890",
          "name": "Николай",
          "timezone": "Europe/Saratov",
          "config": {
            "phoneCode": "7"
          }
        },
        "preventSendSms": true,
        "disableTimeout": true
      }`,
    });
    expect(result.statusCode).toEqual(200);
    expect(result.payload).toContain('{"status":"ok","msg":"wait for auth code","data":{"code":"');
    const payload = JSON.parse(result.payload);
    const code = payload?.data?.code;
    expect(code.length).toEqual(4);
    expect(parseInt(code)).not.toBeNaN();
  });

  it('/user/auth (POST) bad phone 1', async () => {
    const result = await app.inject({
      method: 'POST',
      url: '/user/auth',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      payload: `{
        "userData": {
          "phone": "123456789",
          "name": "Николай",
          "timezone": "Europe/Saratov",
          "config": {
            "phoneCode": "7"
          }
        },
        "preventSendSms": true,
        "disableTimeout": true
      }`,
    });
    expect(result.statusCode).toEqual(400);
    const payload = JSON.parse(result.payload);
    expect(payload.status).toEqual('err');
    expect(payload.code).toEqual('BAD_PHONE_NUMBER');
    expect(payload.msg).toEqual('Phone number is incorrect');
    expect(payload.path).toEqual('/user/auth');
    expect(payload.timestamp).toBeDefined();
  });

  it('/user/auth (POST) bad phone 2', async () => {
    const result = await app.inject({
      method: 'POST',
      url: '/user/auth',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      payload: `{
        "userData": {
          "phone": "123456789a",
          "name": "Николай",
          "timezone": "Europe/Saratov",
          "config": {
            "phoneCode": "7"
          }
        },
        "preventSendSms": true,
        "disableTimeout": true
      }`,
    });
    expect(result.statusCode).toEqual(400);
    const payload = JSON.parse(result.payload);
    expect(payload.status).toEqual('err');
    expect(payload.code).toEqual('BAD_PHONE_NUMBER');
    expect(payload.msg).toEqual('Phone number is incorrect');
    expect(payload.path).toEqual('/user/auth');
    expect(payload.timestamp).toBeDefined();
  });

  it('/user/auth (POST) bad phone 3', async () => {
    const result = await app.inject({
      method: 'POST',
      url: '/user/auth',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      payload: `{
        "userData": {
          "phone": "123456789@",
          "name": "Николай",
          "timezone": "Europe/Saratov",
          "config": {
            "phoneCode": "7"
          }
        },
        "preventSendSms": true,
        "disableTimeout": true
      }`,
    });
    expect(result.statusCode).toEqual(400);
    const payload = JSON.parse(result.payload);
    expect(payload.status).toEqual('err');
    expect(payload.code).toEqual('BAD_PHONE_NUMBER');
    expect(payload.msg).toEqual('Phone number is incorrect');
    expect(payload.path).toEqual('/user/auth');
    expect(payload.timestamp).toBeDefined();
  });

  it('/user/auth (POST) no phone', async () => {
    const result = await app.inject({
      method: 'POST',
      url: '/user/auth',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      payload: `{
        "userData": {
          "name": "Николай",
          "timezone": "Europe/Saratov",
          "config": {
            "phoneCode": "7"
          }
        },
        "preventSendSms": true,
        "disableTimeout": true
      }`,
    });
    expect(result.statusCode).toEqual(400);
    const payload = JSON.parse(result.payload);
    expect(payload.status).toEqual('err');
    expect(payload.code).toEqual('BAD_PHONE_NUMBER');
    expect(payload.msg).toEqual('Phone number is incorrect');
    expect(payload.path).toEqual('/user/auth');
    expect(payload.timestamp).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });
});
