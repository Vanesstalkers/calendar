import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { prepareApp } from './prepareApp';

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    // app = await bootstrap();
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await prepareApp(moduleFixture);
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
