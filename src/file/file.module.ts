import * as nestjs from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { FileController } from './file.controller';
import { FileService, FileServiceSingleton } from './file.service';
import { FileInstance, FileInstanceSingleton } from './file.instance';

@nestjs.Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../../../', 'client'),
    }),
  ],
  controllers: [FileController],
  providers: [FileService, FileInstance, FileServiceSingleton, FileInstanceSingleton],
  exports: [FileService, FileInstance, FileServiceSingleton, FileInstanceSingleton],
})
export class FileModule {}
