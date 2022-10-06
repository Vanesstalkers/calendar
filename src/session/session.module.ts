import * as nestjs from '@nestjs/common';

import { SessionController } from './session.controller';
import { SessionService, SessionServiceSingleton } from './session.service';

@nestjs.Module({
  imports: [],
  controllers: [SessionController],
  providers: [SessionService, SessionServiceSingleton],
  exports: [SessionService, SessionServiceSingleton],
})
export class SessionModule {}
