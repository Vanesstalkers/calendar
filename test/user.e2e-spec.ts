import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import secureSession from '@fastify/secure-session';

describe('UserController (e2e)', () => {
  let app: NestFastifyApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    // app = await bootstrap();
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.register(require('@fastify/multipart'), {
      fileSize: 1000000,
    });

    app.enableCors({ origin: true, credentials: true });
    await app.register(secureSession, {
      secret: 'averylogphrasebiggerthanthirtytwochars',
      salt: 'mq9hDxBVDbspDR6n',
      cookie: { path: '/', sameSite: 'none', secure: true, maxAge: 86400 },
    });

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
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
