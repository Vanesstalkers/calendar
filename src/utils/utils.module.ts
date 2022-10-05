import * as nestjs from '@nestjs/common';

import { UtilsService, UtilsServiceSingleton } from './utils.service';
import { UtilsController } from './utils.controller';

@nestjs.Module({
  imports: [],
  controllers: [UtilsController],
  providers: [UtilsService, UtilsServiceSingleton],
  exports: [UtilsService, UtilsServiceSingleton],
})
export class UtilsModule {}
