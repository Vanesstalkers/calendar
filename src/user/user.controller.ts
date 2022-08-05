import * as nestjs from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import {
  decorators,
  interfaces,
  models,
  types,
  httpAnswer,
  interceptors,
} from '../globalImport';

import { UserService } from './user.service';
import { UtilsService } from '../utils/utils.service';
import { AuthService } from '../auth/auth.service';
import { ProjectService } from '../project/project.service';
import { SessionService } from '../session/session.service';
import { FileService } from '../file/file.service';
import { SessionI } from '../session/interfaces/session.interface';
import { SessionStorageI } from '../session/interfaces/storage.interface';
import { userUpdateDTO } from './user.dto';
import { validateSession } from 'src/common/decorators/access.decorators';

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
class authQueryDTO {
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
  @swagger.ApiProperty({
    example: 1,
    description: 'ID пользователя (контакта)',
  })
  contactId: number;
}
export class searchDTO {
  @swagger.ApiPropertyOptional({
    description: 'Строка запрос',
    example: 'Петров',
  })
  query: string;
  @swagger.ApiPropertyOptional({
    description: 'Поиск по всем пользователям (не только в контактах)',
    example: true,
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
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@nestjs.UseGuards(decorators.validateSession)
@swagger.ApiTags('user')
@swagger.ApiResponse({
  status: 400,
  description: 'Формат ответа для всех ошибок',
  type: () => interfaces.response.exception,
})
@swagger.ApiExtraModels(
  interfaces.response.empty,
  interfaces.response.success,
  interfaces.session.storage,
)
export class UserController {
  constructor(
    private sequelize: Sequelize,
    private userService: UserService,
    private sessionService: SessionService,
    private authService: AuthService,
    private projectService: ProjectService,
    private fileService: FileService,
    private utils: UtilsService,
  ) {}

  // @nestjs.Post('create')
  async create(
    @nestjs.Body() data: types['models']['user'],
    @nestjs.Session() session: FastifySession,
  ) {
    const createResult = await this.userService.create(data);
    return httpAnswer.OK;
  }

  //@nestjs.Post('registration')
  @nestjs.Header('Content-Type', 'application/json')
  async registration(
    @nestjs.Body() data: registrationQueryDTO,
    @nestjs.Session() session: FastifySession,
  ) {
    if (this.utils.validatePhone(data?.user?.phone))
      throw new nestjs.BadRequestException({
        code: 'BAD_PHONE_NUMBER',
        msg: 'Phone number is incorrect',
      });

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
          const transaction = await this.sequelize.transaction();
          const user = await this.userService.create(data.user, transaction);
          await this.sessionService.updateStorage(session, { userId: user.id });

          const personalProject = await this.projectService.create(
            {
              title: `${user.id}th user's personal project`,
              __projecttouser: [{ id: user.id, personal: true }],
            },
            transaction,
          );
          const workProject = await this.projectService.create(
            {
              title: `${user.id}th user's work project`,
              __projecttouser: [{ id: user.id }],
            },
            transaction,
          );
          await transaction.commit();

          await this.changeCurrentProject(
            { projectId: personalProject.id },
            session,
          );
          await this.sessionService.updateStorageById(sessionStorageId, {
            registration: true,
            login: true,
          });
        },
        data.preventSendSms,
      )
      .catch((err) => {
        throw err;
      });

    return { ...httpAnswer.OK, msg: 'wait for auth code', code }; // !!! убрать code после отладки
  }

  @nestjs.Get('session')
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiResponse(
    new interfaces.response.success({
      models: [interfaces.session.storage],
    }),
  )
  async session(@nestjs.Session() session: FastifySession): Promise<object> {
    const result = await this.sessionService.getState(session);
    return { ...httpAnswer.OK, data: result };
  }

  //@nestjs.Post('login')
  @nestjs.Header('Content-Type', 'application/json')
  async login(
    @nestjs.Body() data: authQueryDTO,
    @nestjs.Session() session: FastifySession,
  ) {
    if (this.utils.validatePhone(data?.phone))
      throw new nestjs.BadRequestException({
        code: 'BAD_PHONE_NUMBER',
        msg: 'Phone number is incorrect',
      });

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
          await this.sessionService.updateStorageById(storageId, {
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

    return { ...httpAnswer.OK, msg: 'wait for auth code', code };
  }

  @nestjs.Post('auth')
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiResponse(
    new interfaces.response.success({
      props: {
        code: {
          type: 'string',
          example: '4476',
          description: 'Отправленный код (для отладки)',
        },
      },
    }),
  )
  async auth(
    @nestjs.Body() data: authQueryDTO,
    @nestjs.Session() session: FastifySession,
  ) {
    if (this.utils.validatePhone(data?.phone))
      throw new nestjs.BadRequestException({
        code: 'BAD_PHONE_NUMBER',
        msg: 'Phone number is incorrect',
      });

    const userExist = await this.userService.getOne({ phone: data.phone });
    if (userExist) {
      return this.login(data, session);
    } else {
      return this.registration(
        {
          user: { phone: data.phone },
          preventSendSms: data.preventSendSms,
        },
        session,
      );
    }
  }

  @nestjs.Get('code')
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiResponse(new interfaces.response.success())
  @swagger.ApiResponse({
    status: 201,
    description: 'Код указан с ошибкой (реальный код ответа будет 200)',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'err',
        },
        msg: {
          type: 'string',
          example: 'Wrong auth code',
        },
      },
    },
  })
  async code(
    @nestjs.Query() data: codeQueryDTO,
    @nestjs.Session() session: FastifySession,
    @nestjs.Res({ passthrough: true }) res: fastify.FastifyReply,
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
      throw new nestjs.ForbiddenException('Wrong auth code');

    return httpAnswer.OK;
  }

  @nestjs.Get('getOne')
  @nestjs.Header('Content-Type', 'application/json')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(
    new interfaces.response.success({
      models: [models.user, interfaces.response.empty],
    }),
  )
  async getOne(@nestjs.Query() data: getOneQueryDTO): Promise<{
    status: string;
    data: types['models']['user'] | types['interfaces']['response']['empty'];
  }> {
    if (!data.id) throw new nestjs.BadRequestException('User ID is empty');

    const result = await this.userService.getOne({ id: data.id });
    return {
      ...httpAnswer.OK,
      data: result || new interfaces.response.empty(),
    };
  }

  @nestjs.Post('search')
  @nestjs.Header('Content-Type', 'application/json')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.search({ model: models.user }))
  async search(
    @nestjs.Body() data: searchDTO,
    @nestjs.Session() session: FastifySession,
  ): Promise<{
    status: string;
    data: types['models']['user'] | types['interfaces']['response']['empty'];
  }> {
    data.userId = await this.sessionService.getUserId(session);
    const result = await this.userService.search(data);
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('changeCurrentProject')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
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
    await this.userService.update(userId, { config: { currentProject } });
    await this.sessionService.updateStorageById(session.storageId, {
      currentProject,
    });

    return httpAnswer.OK;
  }

  @nestjs.Post('addContact')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async addContact(
    @nestjs.Query() data: addContactDTO,
    @nestjs.Session() session: FastifySession,
  ): Promise<types['interfaces']['response']['success']> {
    if (!data?.contactId)
      throw new nestjs.BadRequestException('contactId is empty');
    if (!(await this.userService.checkExists(data.contactId)))
      throw new nestjs.BadRequestException(
        `User (id=${data.contactId}) does not exist`,
      );

    const userId = await this.sessionService.getUserId(session);
    await this.userService.addContact({ userId, contactId: data.contactId });

    return httpAnswer.OK;
  }

  @nestjs.Post('update')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiConsumes('multipart/form-data')
  @swagger.ApiResponse(new interfaces.response.success())
  async update(
    @nestjs.Body() @decorators.Multipart() data: userUpdateDTO, // без @nestjs.Body() не будет работать swagger
    @nestjs.Session() session: FastifySession,
  ) {
    const userId = await this.sessionService.getUserId(session);
    await this.userService.update(userId, data.userData);
    data.iconFile.parent_type = 'user';
    data.iconFile.parent_id = userId;
    data.iconFile.file_type = 'icon';
    await this.fileService.create(data.iconFile);

    return httpAnswer.OK;
  }
}
