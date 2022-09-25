import * as nestjs from '@nestjs/common';

import { UtilsService } from './utils.service';
import { UtilsController } from './utils.controller';

@nestjs.Module({
  imports: [],
  controllers: [UtilsController],
  providers: [UtilsService],
  exports: [UtilsService],
})
export class UtilsModule {}
