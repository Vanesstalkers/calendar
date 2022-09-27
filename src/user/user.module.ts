import * as nestjs from '@nestjs/common';

import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserInstance } from './user.instance';

@nestjs.Module({
  imports: [],
  controllers: [UserController],
  providers: [UserInstance, UserService],
  exports: [UserInstance, UserService],
})
export class UserModule {}
