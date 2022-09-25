import * as nestjs from '@nestjs/common';

import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';

@nestjs.Module({
  imports: [],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
