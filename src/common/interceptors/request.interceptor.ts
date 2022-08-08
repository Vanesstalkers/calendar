import * as nestjs from '@nestjs/common';
import { map } from 'rxjs/operators';

@nestjs.Injectable()
export class PostStatusInterceptor {
  intercept(context: nestjs.ExecutionContext, next: nestjs.CallHandler) {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();
    return next.handle().pipe(
      map((value) => {
        if (req.method === 'POST') {
          if (res.statusCode === nestjs.HttpStatus.CREATED) {
            res.status(nestjs.HttpStatus.OK);
          }
        }
        return value;
      }),
    );
  }
}
