import { TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import secureSession from '@fastify/secure-session';
import { InjectOptions } from 'light-my-request';
import { getUserAuthQuery, getUserCodeQuery } from './queryBuilders';
import { creteOrGetUserI } from './interfaces';

export async function prepareApp(moduleFixture: TestingModule) {
  const app: NestFastifyApplication = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
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
  return app;
}

export async function createOrGetUser(data: creteOrGetUserI) {
  // step 1: auth
  const { app, ...rest } = data;
  const query1: InjectOptions = getUserAuthQuery(rest);
  const result1 = await app.inject(query1);
  const cookie1 = result1.headers['set-cookie'].toString();
  const payload1 = JSON.parse(result1.payload);
  // step 2: code
  const query2: InjectOptions = getUserCodeQuery({ code: payload1.data.code, cookie: cookie1 });
  const result2 = await app.inject(query2);
  const cookie2 = result2.headers['set-cookie'].toString();
  return { cookie: cookie2 };
}
