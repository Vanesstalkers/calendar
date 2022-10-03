import { TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import secureSession from '@fastify/secure-session';
import { phones } from './../helpers/constants.json';

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

let phonesCoursor = 0;
export async function getPhone() {
  const phone = phones[phonesCoursor];
  phonesCoursor++;
  return phone;
}
