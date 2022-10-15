import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, types, httpAnswer, interceptors } from '../globalImport';

import { UserService } from './user.service';
import { UtilsService } from '../utils/utils.service';
import { ProjectService } from '../project/project.service';
import { ProjectInstance } from '../project/project.instance';
import { SessionService } from '../session/session.service';
import { FileService } from '../file/file.service';
import { FileInstance } from '../file/file.instance';
import { EventsGateway } from '../events/events.gateway';

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
  userUpdateWithFormdataQueryDTO,
  userLinkWsAnswerDTO,
} from './user.dto';
import { userGetOneAnswerProjectDTO } from '../project/project.dto';
import { uploadedFileDTO } from '../file/file.dto';

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
  userLinkWsAnswerDTO,
)
export class UserController {
  constructor(
    public userService: UserService,
    private sessionService: SessionService,
    private projectService: ProjectService,
    public projectInstance: ProjectInstance,
    private fileService: FileService,
    private fileInstance: FileInstance,
    private utils: UtilsService,
    private events: EventsGateway,
  ) {}

  @nestjs.Get('session')
  @swagger.ApiResponse(new interfaces.response.success({ models: [interfaces.session.storage] }))
  async session(@nestjs.Session() session: FastifySession) {
    const result = await this.sessionService.getState(session.id);
    return { ...httpAnswer.OK, data: result };
  }

  async registration(@nestjs.Body() data: userAuthQueryDTO, @nestjs.Session() session: FastifySession) {
    const phone = data.userData.phone;
    if (this.utils.validatePhone(phone))
      throw new nestjs.BadRequestException({ code: 'BAD_PHONE_NUMBER', msg: 'Phone number is incorrect' });

    await this.sessionService.update(session.id, { phone });
    const code = this.utils.randomCode();
    if (!data.preventSendSms) await this.utils.sendSMS(phone, code);
    await this.sessionService.update(session.id, {
      phone,
      authCode: code,
      authType: 'registration',
      registrationData: data.userData,
    });

    return { ...httpAnswer.OK, msg: 'wait for auth code', data: { code } }; // !!! убрать code после отладки
  }

  async login(@nestjs.Body() data: userAuthQueryDTO, @nestjs.Session() session: FastifySession) {
    const phone = data.userData.phone;
    if (this.utils.validatePhone(phone))
      throw new nestjs.BadRequestException({ code: 'BAD_PHONE_NUMBER', msg: 'Phone number is incorrect' });

    const code = this.utils.randomCode();
    if (!data.preventSendSms) await this.utils.sendSMS(phone, code);
    await this.sessionService.update(session.id, { phone, authCode: code, authType: 'login' });

    return { ...httpAnswer.OK, msg: 'wait for auth code', data: { code } };
  }

  @nestjs.Post('auth')
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
  async auth(@nestjs.Body() data: userAuthQueryDTO, @nestjs.Session() session: FastifySession) {
    const phone = data.userData.phone;
    if (this.utils.validatePhone(phone))
      throw new nestjs.BadRequestException({ code: 'BAD_PHONE_NUMBER', msg: 'Phone number is incorrect' });

    const sessionData = await this.sessionService.get(session.id);
    const timeout = new Date().getTime() - new Date(sessionData?.lastAuthAttempt || 0).getTime();
    const timeoutAmount = 60;
    if (!data.disableTimeout && timeout < timeoutAmount * 1000)
      throw new nestjs.BadRequestException({
        code: 'AUTH_TIMEOUT',
        msg: `Wait ${timeoutAmount - Math.floor(timeout / 1000)} seconds before next attempt.`,
      });

    await this.sessionService.update(session.id, { lastAuthAttempt: new Date() });

    const userExist = await this.userService.getOne({ phone });
    if (userExist) {
      return this.login(data, session);
    } else {
      return this.registration(data, session);
    }
  }

  @nestjs.Post('code')
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
    const sessionData = await this.sessionService.get(session.id);
    if (data.code !== sessionData.authCode)
      throw new nestjs.ForbiddenException({ code: 'WRONG_AUTH_CODE', msg: 'Wrong auth code' });

    let user;
    switch (sessionData.authType) {
      case 'registration':
        user = await this.userService.registrate(sessionData.registrationData);
        sessionData.currentProjectId = user.config.personalProjectId;
        break;
      case 'login':
        user = await this.userService.getOne({ phone: sessionData.phone }, { includeSessions: true });
        sessionData.currentProjectId = user.config.currentProjectId;
        break;
      default:
        new nestjs.ForbiddenException({ code: 'WRONG_AUTH_TYPE', msg: 'Wrong auth type' });
    }

    session.userId = user.id;
    sessionData.userId = user.id;
    sessionData.registration = true;
    sessionData.login = true;
    sessionData.personalProjectId = user.config.personalProjectId;
    sessionData.authCode = undefined;
    sessionData.authType = undefined;
    sessionData.registrationData = undefined;
    await this.sessionService.update(session.id, sessionData);

    const updateSessions = {};
    updateSessions[session.id] = {};
    for (const key of Object.keys(user.sessions || {})) {
      const sessionIsAlive = await this.sessionService.get(key);
      if (!sessionIsAlive) updateSessions[key] = undefined; // utils.updateDB удалит ключ у json-поля в БД
    }
    await this.userService.update(user.id, { sessions: updateSessions });

    return httpAnswer.OK;
  }

  @nestjs.Post('logout')
  async logout(@nestjs.Session() session: FastifySession) {
    await this.sessionService.update(session.id, { login: false });
    return httpAnswer.OK;
  }

  @nestjs.Get('getOne')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success({ models: [userGetOneAnswerDTO] }))
  async getOne(@nestjs.Query() data: userGetOneQueryDTO, @nestjs.Session() session: FastifySession) {
    if (!data.userId) throw new nestjs.BadRequestException('User ID is empty');

    const result = await this.userService.getOne({ id: data.userId }, { subscriberCode: session.id });

    const sessionData = await this.sessionService.get(session.id);
    if (sessionData.eventsId) {
      const ws = this.events.server.of('/').sockets.get(sessionData.eventsId);
      if (ws) ws.emit('message', JSON.stringify(result));
    }
    return { ...httpAnswer.OK, data: result };
  }

  @nestjs.Post('search')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.search({ model: userSearchAnswerDTO }))
  async search(@nestjs.Body() data: userSearchQueryDTO, @nestjs.Session() session: FastifySession) {
    data.userId = session.userId;
    const result = await this.userService.search(data);
    return { ...httpAnswer.OK, data: { resultList: result.data, endOfList: result.endOfList } };
  }

  @nestjs.Post('changeCurrentProject')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success({ models: [userGetOneAnswerProjectDTO] }))
  async changeCurrentProject(
    @nestjs.Query() data: userChangeCurrentProjectQueryDTO,
    @nestjs.Session() session: FastifySession,
  ) {
    const projectId = parseInt(data.projectId);
    const sessionUserId = session.userId;
    const project = await this.projectInstance.init(projectId, sessionUserId);
    const switchToProjectId = project.id;
    const sessionData = await this.sessionService.get(session.id);

    const projectLink = await project.consumer.switchProject(session.id, {
      switchToProjectId,
      switchFromProjectId: sessionData.currentProjectId,
    });

    return { ...httpAnswer.OK, data: projectLink };
  }

  @nestjs.Post('update')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiResponse(new interfaces.response.success({ models: [uploadedFileDTO] }))
  async update(@nestjs.Body() data: userUpdateQueryDTO, @nestjs.Session() session: FastifySession) {
    const userId = data.userId;
    if (!data.userData) data.userData = {};
    if (data.userData.phone) throw new nestjs.BadRequestException('Access denied to change phone number');

    if (data.iconFile !== undefined) {
      if (data.iconFile === null) {
        data.userData.iconFile = null;
      } else {
        data.userData.iconFile = await this.fileInstance.uploadAndGetDataFromBase64(data.iconFile);
      }
    }
    const {
      uploadedFile: { id: uploadedFileId },
    } = await this.userService.update(userId, data.userData);

    return { ...httpAnswer.OK, data: { uploadedFileId } };
  }

  @nestjs.Post('updateWithFormdata')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiConsumes('multipart/form-data')
  @swagger.ApiResponse(new interfaces.response.success({ models: [uploadedFileDTO] }))
  async updateWithFormdata(
    @nestjs.Body() data: userUpdateWithFormdataQueryDTO, // без @nestjs.Body() не будет работать swagger
    @nestjs.Session() session: FastifySession,
  ) {
    if (!data.userData) data.userData = {};
    if (data.userData.phone) throw new nestjs.BadRequestException('Access denied to change phone number');

    const userId = data.userId;
    data.userData.iconFile = data.iconFile;
    const {
      uploadedFile: { id: uploadedFileId },
    } = await this.userService.update(userId, data.userData);

    return { ...httpAnswer.OK, data: { uploadedFileId } };
  }
}
