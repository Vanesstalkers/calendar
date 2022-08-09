import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ServeStaticModule } from '@nestjs/serve-static';
import { models } from '../globalImport';

import { FileController } from './file.controller';
import { FileService } from './file.service';
import { SessionService } from '../session/session.service';
import { UtilsService } from '../utils/utils.service';
import { join } from 'path';

@Module({
  imports: [
    SequelizeModule.forFeature([
      models.file,
      models.user,
      models.project,
      models.project2user,
    ]),
    // ServeStaticModule.forRoot({
    //   rootPath: join(__dirname, '../../../', 'client'),
    
    //   // rootPath: join(__dirname, '../../../', 'uploads'),
    //   // serveRoot: '/some/',
    //   exclude: ['/api*'],
    // }),
  ],
  providers: [FileService, SessionService, UtilsService],
  controllers: [FileController],
})
export class FileModule {}
