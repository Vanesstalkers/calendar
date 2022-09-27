import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import secureSession from '@fastify/secure-session';

describe('AppController (e2e)', () => {
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
      //attachFieldsToBody: 'keyValues',
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

  it('/ (GET)', async () => {
    const result = await app.inject({
      method: 'GET',
      url: '/',
    });
    expect(result.statusCode).toEqual(404);
    expect(result.payload).toEqual('{"statusCode":404,"message":"Cannot GET /","error":"Not Found"}');
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });
});
