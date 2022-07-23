import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import secureSession from '@fastify/secure-session';
import { AppModule } from './app.module';
import { UniversalExceptionFilter } from './exception.filter';

import { Readable } from 'stream';

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
      {
        abortOnError: false,
      },
    );
    await app.register(secureSession, {
      secret: 'averylogphrasebiggerthanthirtytwochars',
      salt: 'mq9hDxBVDbspDR6n',
    });
    app.useGlobalFilters(new UniversalExceptionFilter(app.get(HttpAdapterHost)));
    await app.listen(3000);
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
  //     class ReadableString extends Readable {
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
