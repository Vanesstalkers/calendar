import * as nestjs from '@nestjs/common';

import { UserController } from './user.controller';
import { UserService } from './user.service';

@nestjs.Module({
  imports: [],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
