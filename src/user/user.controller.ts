import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import {
  decorators,
  interfaces,
  models,
  types,
  answerCode,
} from '../globalImport';

import { UserService } from './user.service';
import { UtilsService } from '../utils/utils.service';
import { AuthService } from '../auth/auth.service';
import { ProjectService } from '../project/project.service';
import { SessionService } from '../session/session.service';
import { SessionI } from '../session/interfaces/session.interface';
import { SessionStorageI } from '../session/interfaces/storage.interface';

import {
  validateSession,
  isLoggedIn,
} from '../common/decorators/access.decorators';

class getOneQueryDTO {
  @swagger.ApiProperty({
    example: 1,
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
export class registrationQueryDTO {
  @swagger.ApiProperty({ type: () => models.user })
  user: types['models']['user'];
  @swagger.ApiPropertyOptional({
    description: 'Не отправлять СМС',
    example: 'true',
  })
  preventSendSms: string;
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
class addContactDTO {
  @swagger.ApiProperty({ example: 1, description: 'ID пользователя' })
  userId: number;
}
export class searchDTO {
  @swagger.ApiPropertyOptional({
    description: 'Строка запрос',
    example: 'Петров',
  })
  query: string;
  @swagger.ApiPropertyOptional({
    description: 'Поиск по всем пользователям (не только в контактах)',
    example: 'true|false',
  })
  globalSearch?: boolean;
  @swagger.ApiPropertyOptional({
    description: 'Лимит',
    example: 10,
  })
  limit?: number;
  userId?: number;
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
    private projectService: ProjectService,
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
    @nestjs.Body() data: registrationQueryDTO,
    @nestjs.Session() session: FastifySession,
  ) {
    if (this.utils.validatePhone(data?.user?.phone))
      throw new nestjs.BadRequestException('Phone number is incorrect');

    const userExist = await this.userService.getOne({ phone: data.user.phone });
    if (userExist)
      throw new nestjs.BadRequestException('Phone number already registred');

    await this.sessionService.updateStorage(session, {
      phone: data.user.phone,
    });

    const sessionStorageId = session.storageId;
    const code = await this.authService
      .runAuthWithPhone(
        data.user.phone,
        async () => {
          const user = await this.userService.create(data.user);
          await this.sessionService.updateStorage(session, { userId: user.id });
          const personalProject = await this.projectService.create({
            project: { title: `${user.id}th user's personal project` },
            project_link: { personal: true },
            userId: user.id,
          });
          const workProject = await this.projectService.create({
            project: { title: `${user.id}th user's work project` },
            userId: user.id,
          });

          this.changeCurrentProject({ projectId: personalProject.id }, session);
          this.sessionService.updateStorageById(sessionStorageId, {
            registration: true,
            login: true,
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

  @nestjs.Post('search')
  @nestjs.Header('Content-Type', 'application/json')
  @nestjs.UseGuards(isLoggedIn)
  async search(
    @nestjs.Query() data: searchDTO,
    @nestjs.Session() session: FastifySession,
  ): Promise<{
    status: answerCode;
    data:
      | [types['models']['user'] | types['interfaces']['response']['empty']]
      | [];
  }> {
    data.userId = await this.sessionService.getUserId(session);
    const result = await this.userService.search(data);
    return { status: answerCode.OK, data: result };
  }

  @nestjs.Post('changeCurrentProject')
  @nestjs.UseGuards(isLoggedIn)
  async changeCurrentProject(
    @nestjs.Query() data: changeCurrentProjectDTO,
    @nestjs.Session() session: FastifySession,
  ): Promise<types['interfaces']['response']['success']> {
    if (!data?.projectId)
      throw new nestjs.BadRequestException('Project ID is empty');

    const userId = await this.sessionService.getUserId(session);
    const project = await this.projectService.getOne({
      id: data.projectId,
      userId,
    });
    if (!project)
      throw new nestjs.BadRequestException(
        'Project is not exist in user`s project list.',
      );

    const currentProject = { id: project.id, title: project.title };
    await this.userService.update(userId, {
      config: { currentProject },
    });
    this.sessionService.updateStorageById(session.storageId, {
      currentProject,
    });

    return { status: answerCode.OK };
  }

  @nestjs.Post('addContact')
  // @nestjs.UseGuards(isLoggedIn)
  async addContact(
    @nestjs.Query() data: addContactDTO,
    @nestjs.Session() session: FastifySession,
  ): Promise<types['interfaces']['response']['success']> {
    if (!data?.userId) throw new nestjs.BadRequestException('User ID is empty');

    if (!(await this.userService.checkExists(data.userId)))
      throw new nestjs.BadRequestException('User does not exist');

    const userId = await this.sessionService.getUserId(session);
    this.userService.addContact({ userId, relUserId: data.userId });

    return { status: answerCode.OK };
  }

  @nestjs.Post('update')
  @swagger.ApiBody({ type: models.user })
  @nestjs.UseGuards(isLoggedIn)
  async update(
    @nestjs.Body() data: types['models']['user'],
    @nestjs.Session() session: FastifySession,
  ) {
    const userId = await this.sessionService.getUserId(session);
    await this.userService.update(userId, data);
  }
}
