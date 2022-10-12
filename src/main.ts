import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import secureSession from '@fastify/secure-session';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
      abortOnError: false,
      // logger: false,
    });
    app.setGlobalPrefix('api');
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
    const swaggerConfig = new DocumentBuilder()
      .setTitle('API description')
      .setDescription('')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document);

    const host = process.env.HOST || '127.0.0.1';
    const port = process.env.PORT || 3000;
    console.log(`Server starting at ${host}:${port}`);
    await app.listen(port, host);
    console.log(`Server started at ${host}:${port}`);
  } catch (err) {
    console.log('abortOnError catched', { err });
  }

  // ДЛЯ ОТЛАДКИ ЗАПРОСОВ С НЕИЗВЕСТНЫМ СОДЕРЖИМЫМ
  // app.use(function (req, res, next) {
  //   var rawbody = '';
  //   req.setEncoding('utf8');
  //   req.on('data', function (chunk) {
  //     rawbody += chunk;
  //   });
  //   req.on('end', function () {
  //     class ReadableString extends stream.Readable {
  //       private sent = false;
  //       constructor(private str: string) {
  //         super();
  //       }
  //       _read() {
  //         if (!this.sent) {
  //           this.push(Buffer.from(this.str));
  //           this.sent = true;
  //         } else {
  //           this.push(null);
  //         }
  //       }
  //     }
  //     const contentStream = new ReadableString(rawbody);
  //     contentStream.pipe(res);
  //   });
  // });
}

bootstrap();
