import * as nestjs from '@nestjs/common';

import { SessionController } from './session.controller';
import { SessionService } from './session.service';

@nestjs.Module({
  imports: [],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
