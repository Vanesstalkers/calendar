import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types } from '../globalImport';

import { UserService } from './user.service';
import { UtilsService } from '../utils/utils.service';
import { AuthService } from '../auth/auth.service';
import { SessionService } from '../session/session.service';
import { SessionI } from '../session/interfaces/session.interface';
import { SessionStorageI } from '../session/interfaces/storage.interface';

import { validateSession, isLoggedIn } from '../common/decorators/access.decorators';

class getOneQueryDTO {
  @swagger.ApiProperty({
    example: '1,2,3...',
    description: 'ID пользователя',
  })
  id: number;
}
class codeQueryDTO {
  @swagger.ApiProperty({
    example: '4523',
    description: 'Проверочный код из СМС',
  })
  code: string;
}
class loginQueryDTO {
  @swagger.ApiProperty({ description: 'Номер телефона', example: '9265126677' })
  phone: string;
  @swagger.ApiPropertyOptional({
    description: 'Не отправлять СМС',
    example: 'true',
  })
  preventSendSms: string;
}
class changeCurrentProjectDTO {
  @swagger.ApiProperty({ example: 1, description: 'ID проекта' })
  projectId: number;
}

@nestjs.Controller('user')
@swagger.ApiTags('user')
@swagger.ApiResponse({
  status: 400,
  description: 'Формат ответа для всех ошибок',
  type: () => interfaces.response.exception,
})
@swagger.ApiExtraModels(interfaces.response.empty, interfaces.response.success)
@nestjs.UseGuards(validateSession)
export class UserController {
  constructor(
    private userService: UserService,
    private sessionService: SessionService,
    private authService: AuthService,
    private utils: UtilsService,
  ) {}

  // @nestjs.Post('create')
  async create(
    @nestjs.Body() data: types['models']['user'],
    @nestjs.Session() session: FastifySession,
  ) {
    const createResult = await this.userService.create(data);
    return { status: 'ok' };
  }

  @nestjs.Post('registration')
  async registration(
    @nestjs.Body() data: types['models']['user'],
    @nestjs.Session() session: FastifySession,
  ) {
    if (this.utils.validatePhone(data?.phone))
      throw new nestjs.BadRequestException('Phone number is incorrect');

    const userExist = await this.userService.getOne({ phone: data.phone });
    if (userExist)
      throw new nestjs.BadRequestException('Phone number already registred');

    await this.sessionService.updateStorage(session, { phone: data.phone });

    const sessionStorageId = session.storageId;
    const code = await this.authService
      .runAuthWithPhone(
        data.phone,
        async () => {
          const createResult = await this.userService.create(data);
          this.sessionService.updateStorageById(sessionStorageId, {
            userId: createResult.user.id,
            registration: true,
            currentProject: {
              id: createResult.project.id,
              title: createResult.project.title,
            },
          });
        },
        data.preventSendSms,
      )
      .catch((err) => {
        throw err;
      });

    return { status: 'ok', msg: 'wait for auth code', code }; // !!! убрать code после отладки
  }

  @nestjs.Get('session')
  @nestjs.Header('Content-Type', 'application/json')
  async session(@nestjs.Session() session: FastifySession): Promise<object> {
    return await this.sessionService.getState(session);
  }

  @nestjs.Post('login')
  @nestjs.Header('Content-Type', 'application/json')
  async login(
    @nestjs.Body() data: loginQueryDTO,
    @nestjs.Session() session: FastifySession,
  ) {
    if (this.utils.validatePhone(data?.phone))
      throw new nestjs.BadRequestException('Phone number is incorrect');

    const userExist = await this.userService.getOne({ phone: data.phone });
    if (!userExist)
      throw new nestjs.BadRequestException(
        'Phone number not found (use `registration` method first)',
      );

    await this.sessionService.updateStorage(session, { phone: data.phone });

    const storageId = session.storageId;
    const code = await this.authService
      .runAuthWithPhone(
        data.phone,
        async () => {
          const user = await this.userService.getOne({ phone: data.phone });
          this.sessionService.updateStorageById(storageId, {
            userId: user.id,
            registration: true,
            login: true,
            currentProject: user.config.currentProject,
          });
        },
        data.preventSendSms,
      )
      .catch((err) => {
        throw err;
      });

    return { status: 'ok', msg: 'wait for auth code', code };
  }

  @nestjs.Get('code')
  @nestjs.Header('Content-Type', 'application/json')
  async code(
    @nestjs.Query() data: codeQueryDTO,
    @nestjs.Session() session: FastifySession,
  ) {
    if (!data?.code) throw new nestjs.BadRequestException('Auth code is empty');

    const sessionStorage: SessionStorageI =
      await this.sessionService.getStorage(session);
    const checkAuthCode = await this.authService
      .checkAuthCode(sessionStorage.phone, data.code)
      .catch((err) => {
        if (err.message === 'Auth session not found')
          throw new nestjs.ForbiddenException('Send auth request first');
        else throw err;
      });

    if (checkAuthCode === false)
      return { status: 'error', msg: 'Wrong auth code' };

    return { status: 'ok' };
  }

  @nestjs.Get('getOne')
  @nestjs.Header('Content-Type', 'application/json')
  @nestjs.UseGuards(isLoggedIn)
  @swagger.ApiResponse(
    new interfaces.response.success(models.user, interfaces.response.empty),
  )
  async getOne(@nestjs.Query() data: getOneQueryDTO): Promise<{
    status: string;
    data: types['models']['user'] | types['interfaces']['response']['empty'];
  }> {
    if (!data.id) throw new nestjs.BadRequestException('User ID is empty');

    const result = await this.userService.getOne({ id: data.id });
    return { status: 'ok', data: result || new interfaces.response.empty() };
  }

  @nestjs.Get('search')
  @nestjs.Header('Content-Type', 'application/json')
  @nestjs.UseGuards(isLoggedIn)
  async search(@nestjs.Query('query') query: string): Promise<{
    status: string;
    data: [types['models']['user'] | types['interfaces']['response']['empty']] | [];
  }> {
    const result = await this.userService.search(query);
    return { status: 'ok', data: result };
  }

  @nestjs.Post('changeCurrentProject')
  @nestjs.UseGuards(isLoggedIn)
  async changeCurrentProject(
    @nestjs.Query() data: changeCurrentProjectDTO,
    @nestjs.Session() session: FastifySession,
  ): Promise<types['interfaces']['response']['success']> {
    this.sessionService.updateStorageById(session.storageId, {});
    // const userId = await this.sessionService.getUserId(session);
    // await this.userService.changeCurrentProject({
    //   projectId: data.projectId,
    //   userId,
    // });
    return { status: 'ok' };
  }
}
