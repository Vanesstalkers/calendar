import * as nestjs from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types, httpAnswer, interceptors } from '../globalImport';

import { UserService } from './user.service';
import { UtilsService } from '../utils/utils.service';
import { AuthService } from '../auth/auth.service';
import { ProjectService } from '../project/project.service';
import { SessionService } from '../session/session.service';
import { FileService } from '../file/file.service';

import {
  userAuthQueryDTO,
  userAuthQueryDataDTO,
  userCodeQueryDTO,
  userGetOneQueryDTO,
  userGetOneAnswerDTO,
  userSearchQueryDTO,
  userSearchAnswerDTO,
  userChangeCurrentProjectQueryDTO,
  userAddContactQueryDTO,
  userUpdateQueryDTO,
} from './user.dto';

import { userGetOneAnswerProjectDTO } from '../project/project.dto';

@nestjs.Controller('user')
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@nestjs.UseGuards(decorators.validateSession)
@swagger.ApiTags('user')
@swagger.ApiResponse({ status: 400, description: 'Формат ответа для всех ошибок', type: interfaces.response.exception })
@swagger.ApiExtraModels(
  interfaces.response.empty,
  interfaces.response.success,
  interfaces.session.storage,
  userSearchAnswerDTO,
  userGetOneAnswerDTO,
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

  @nestjs.Get('session')
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiResponse(new interfaces.response.success({ models: [interfaces.session.storage] }))
  async session(@nestjs.Session() session: FastifySession): Promise<object> {
    const result = await this.sessionService.getState(session);
    return { ...httpAnswer.OK, data: result };
  }

  // @nestjs.Post('create')
  async create(@nestjs.Body() data: types['models']['user'], @nestjs.Session() session: FastifySession) {
    const createResult = await this.userService.create(data);
    return httpAnswer.OK;
  }

  //@nestjs.Post('registration')
  @nestjs.Header('Content-Type', 'application/json')
  async registration(@nestjs.Body() data: userAuthQueryDTO, @nestjs.Session() session: FastifySession) {
    const phone = data.userData.phone;
    if (this.utils.validatePhone(phone))
      throw new nestjs.BadRequestException({ code: 'BAD_PHONE_NUMBER', msg: 'Phone number is incorrect' });

    const userExist = await this.userService.getOne({ phone });
    if (userExist) throw new nestjs.BadRequestException('Phone number already registred');

    await this.sessionService.updateStorage(session, { phone });
    const sessionStorage = await this.sessionService.getStorage(session);
    const sessionStorageId = session.storageId;
    const code = await this.authService
      .runAuthWithPhone(
        phone,
        async () => {
          const transaction = await this.sequelize.transaction();
          const user = await this.userService.create(data.userData, transaction);
          await this.sessionService.updateStorage(session, { userId: user.id });

          const personalProject = await this.projectService.create(
            { title: `${user.id}th user's personal project`, userList: [{ userId: user.id, role: "owner" }] },
            { transaction, personalProject: true },
          );
          const workProject = await this.projectService.create(
            { title: `${user.id}th user's work project`, userList: [{ userId: user.id, role: "owner" }] },
            { transaction },
          );
          await transaction.commit();

          await this.changeCurrentProject({ projectId: personalProject.id }, session);
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

    return { ...httpAnswer.OK, msg: 'wait for auth code', data: { code } }; // !!! убрать code после отладки
  }

  //@nestjs.Post('login')
  @nestjs.Header('Content-Type', 'application/json')
  async login(@nestjs.Body() data: userAuthQueryDTO, @nestjs.Session() session: FastifySession) {
    const phone = data.userData.phone;
    if (this.utils.validatePhone(phone))
      throw new nestjs.BadRequestException({ code: 'BAD_PHONE_NUMBER', msg: 'Phone number is incorrect' });

    const userExist = await this.userService.getOne({ phone });
    if (!userExist) throw new nestjs.BadRequestException('Phone number not found (use `registration` method first)');

    await this.sessionService.updateStorage(session, { phone });

    const storageId = session.storageId;
    const code = await this.authService
      .runAuthWithPhone(
        phone,
        async () => {
          const user = await this.userService.getOne({ phone });
          await this.sessionService.updateStorageById(storageId, {
            userId: user.id,
            registration: true,
            login: true,
            currentProjectId: user.config.currentProjectId,
          });
        },
        data.preventSendSms,
      )
      .catch((err) => {
        throw err;
      });

    return { ...httpAnswer.OK, msg: 'wait for auth code', data: { code } };
  }

  @nestjs.Post('auth')
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiResponse(
    new interfaces.response.success({
      props: {
        data: {
          type: 'object',
          required: ['code'],
          properties: {
            code: {
              type: 'string',
              example: '4476',
              description: 'Отправленный код (для отладки)',
            },
          },
        },
      },
    }),
  )
  async auth(
    @nestjs.Body() data: userAuthQueryDTO,
    @nestjs.Session() session: FastifySession,
    @nestjs.Res({ passthrough: true }) res: fastify.FastifyReply,
  ) {
    const phone = data.userData.phone;
    if (this.utils.validatePhone(phone))
      throw new nestjs.BadRequestException({ code: 'BAD_PHONE_NUMBER', msg: 'Phone number is incorrect' });

    const userExist = await this.userService.getOne({ phone });
    if (userExist) {
      return this.login(data, session);
    } else {
      return this.registration(data, session);
    }
  }

  @nestjs.Post('code')
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiResponse(new interfaces.response.success())
  @swagger.ApiResponse({
    status: 201,
    description: 'Код введен с ошибкой (реальный код ответа будет 403)',
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
  async code(@nestjs.Body() data: userCodeQueryDTO, @nestjs.Session() session: FastifySession) {
    if (!data?.code) throw new nestjs.BadRequestException('Auth code is empty');

    const sessionStorage = await this.sessionService.getStorage(session);
    const checkAuthCode = await this.authService.checkAuthCode(sessionStorage.phone, data.code).catch((err) => {
      if (err.message === 'Auth session not found') throw new nestjs.ForbiddenException('Send auth request first');
      else throw err;
    });

    if (checkAuthCode === false) throw new nestjs.ForbiddenException('Wrong auth code');

    return httpAnswer.OK;
  }

  @nestjs.Get('getOne')
  @nestjs.Header('Content-Type', 'application/json')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success({ models: [userGetOneAnswerDTO] }))
  async getOne(@nestjs.Query() data: userGetOneQueryDTO) {
    if (!data.userId) throw new nestjs.BadRequestException('User ID is empty');
    const result = await this.userService.getOne({ id: data.userId });
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('search')
  @nestjs.Header('Content-Type', 'application/json')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.search({ model: userSearchAnswerDTO }))
  async search(@nestjs.Body() data: userSearchQueryDTO, @nestjs.Session() session: FastifySession) {
    data.userId = await this.sessionService.getUserId(session);
    const result = await this.userService.search(data);
    return { ...httpAnswer.OK, data: result.data, endOfList: result.endOfList };
  }

  @nestjs.Post('changeCurrentProject')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success({ models: [userGetOneAnswerProjectDTO] }))
  async changeCurrentProject(
    @nestjs.Query() data: userChangeCurrentProjectQueryDTO,
    @nestjs.Session() session: FastifySession,
  ) {
    if (!data?.projectId) throw new nestjs.BadRequestException('Project ID is empty');

    const userId = await this.sessionService.getUserId(session);
    const project = await this.projectService.getOne({ id: data.projectId });
    if (!project) throw new nestjs.BadRequestException('Project is not exist in user`s project list.');

    const currentProjectId = project.id;
    await this.userService.update(userId, { config: { currentProjectId } });
    await this.sessionService.updateStorageById(session.storageId, { currentProjectId });

    const projectToUser = project.userList.find((user) => user.userId === userId);
    projectToUser.projectId = project.id;
    delete projectToUser.userId;
    return { ...httpAnswer.OK, data: projectToUser };
  }

  @nestjs.Post('addContact')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success())
  async addContact(@nestjs.Body() data: userAddContactQueryDTO, @nestjs.Session() session: FastifySession) {
    const contactId = data?.contactId;
    if (!contactId) throw new nestjs.BadRequestException('contactId is empty');

    const contactUserExist = await this.userService.checkExists(contactId);
    if (!contactUserExist) throw new nestjs.BadRequestException(`User (id=${contactId}) does not exist`);

    const userId = await this.sessionService.getUserId(session);
    const contactExist = await this.userService.checkContactExists(userId, contactId);
    if (contactExist) throw new nestjs.BadRequestException(`Contact (id=${contactId}) already exist`);

    await this.userService.addContact({ userId, contactId });

    return httpAnswer.OK;
  }

  @nestjs.Post('update')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiConsumes('multipart/form-data')
  @swagger.ApiResponse(new interfaces.response.success())
  async update(
    @nestjs.Body() @decorators.Multipart() data: userUpdateQueryDTO, // без @nestjs.Body() не будет работать swagger
    @nestjs.Session() session: FastifySession,
  ) {
    if (data.userData.phone) throw new nestjs.BadRequestException('Access denied to change phone number');

    const userId = data.userId;
    await this.userService.update(userId, data.userData);
    if (data.iconFile) {
      data.iconFile.parentType = 'user';
      data.iconFile.parentId = userId;
      data.iconFile.fileType = 'icon';
      await this.fileService.create(data.iconFile);
    }

    return httpAnswer.OK;
  }
}
