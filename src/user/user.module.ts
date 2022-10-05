import * as nestjs from '@nestjs/common';

import { UserController } from './user.controller';
import { UserService, UserServiceSingleton } from './user.service';
import { UserInstance, UserInstanceSingleton } from './user.instance';

@nestjs.Module({
  imports: [],
  controllers: [UserController],
  providers: [UserInstance, UserService, UserInstanceSingleton, UserServiceSingleton],
  exports: [UserInstance, UserService, UserInstanceSingleton, UserServiceSingleton],
})
export class UserModule {}
