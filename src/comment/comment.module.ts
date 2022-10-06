import * as nestjs from '@nestjs/common';

import { CommentController } from './comment.controller';
import { CommentService, CommentServiceSingleton } from './comment.service';

@nestjs.Module({
  imports: [],
  controllers: [CommentController],
  providers: [CommentService, CommentServiceSingleton],
  exports: [CommentService, CommentServiceSingleton],
})
export class CommentModule {}
