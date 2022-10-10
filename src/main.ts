import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import secureSession from '@fastify/secure-session';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as stream from 'stream';

import { AppModule } from './app.module';
import { UniversalExceptionFilter } from './common/filters/exception.filter';

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
      abortOnError: false,
      logger: false,
    });
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

    // app.useGlobalFilters(new UniversalExceptionFilter(app.get(HttpAdapterHost)));

    const swaggerConfig = new DocumentBuilder()
      .setTitle('API description')
      .setDescription('')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document);

    await app.listen(process.env.PORT || 3000);
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
