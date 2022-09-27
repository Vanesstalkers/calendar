import * as nestjs from '@nestjs/common';
import { join } from 'path';

import { FileController } from './file.controller';
import { FileService } from './file.service';
import { FileInstance } from './file.instance';

@nestjs.Module({
  imports: [
    // ServeStaticModule.forRoot({
    //   rootPath: join(__dirname, '../../../', 'client'),
    //   // rootPath: join(__dirname, '../../../', 'uploads'),
    //   // serveRoot: '/some/',
    //   exclude: ['/api*'],
    // }),
  ],
  controllers: [FileController],
  providers: [FileService, FileInstance],
  exports: [FileService, FileInstance],
})
export class FileModule {}
