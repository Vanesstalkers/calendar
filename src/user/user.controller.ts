import {
  Controller,
  Get,
  Post,
  Header,
  Session,
  Body,
  Query,
  Req,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';

import { UserService } from './user.service';
import { UtilsService } from '../utils.service';
import { AuthService } from '../auth/auth.service';
import { SessionService } from '../session/session.service';
import { SessionI } from '../session/session.interface';
import { SessionStorageI } from '../session/storage.interface';

import { User } from '../models/user';

@Controller('user')
export class UserController {
  constructor(
    private userService: UserService,
    private sessionService: SessionService,
    private authService: AuthService,
    private utils: UtilsService,
  ) {}

  @Post('create')
  async create(@Body() data: User, @Session() session: FastifySession) {
    const createResult = await this.userService.create(data);
    return { status: 'ok' };
  }

  @Post('registration')
  async registration(@Body() data: User, @Session() session: FastifySession) {
    if (this.utils.validatePhone(data?.phone))
      throw new BadRequestException('Phone number is incorrect');

    const userExist = await this.userService.getOne({ phone: data.phone });
    if (userExist)
      throw new BadRequestException('Phone number already registred');

    await this.sessionService.validateSession(session);
    const storageId = session.storageId;

    const code = await this.authService
      .runAuthWithPhone(
        data.phone,
        async () => {
          const createResult = await this.userService.create(data);
          this.sessionService.updateStorageById(storageId, {
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

    await this.sessionService.updateStorage(session, { phone: data.phone });
    return { status: 'ok', msg: 'wait for auth code', code }; // !!! убрать code после отладки
  }

  @Get('session')
  @Header('Content-Type', 'application/json')
  async session(@Session() session: FastifySession): Promise<object> {
    return await this.sessionService.getState(session);
  }

  @Get('login')
  @Header('Content-Type', 'application/json')
  async login(
    @Query() data: { phone: string; preventSendSms: string },
    @Session() session: FastifySession,
  ) {
    if (this.utils.validatePhone(data?.phone))
      throw new BadRequestException('Phone number is incorrect');

    const userExist = await this.userService.getOne({ phone: data.phone });
    if (!userExist)
      throw new BadRequestException(
        'Phone number not found (use `registration` method first)',
      );

    await this.sessionService.validateSession(session);
    const storageId = session.storageId;

    const code = await this.authService
      .runAuthWithPhone(
        data.phone,
        async () => {
          const user = await this.userService.getOne({ phone: data.phone });
          this.sessionService.updateStorageById(storageId, {
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

    await this.sessionService.updateStorage(session, { phone: data.phone });
    return { status: 'ok', msg: 'wait for auth code', code };
  }

  @Get('code')
  @Header('Content-Type', 'application/json')
  async code(
    @Query() data: { code: string },
    @Session() session: FastifySession,
  ) {
    if (!data?.code) throw new BadRequestException('Auth code is empty');

    const sessionStorage: SessionStorageI =
      await this.sessionService.getStorage(session);
    const checkAuthCode = await this.authService
      .checkAuthCode(sessionStorage.phone, data.code)
      .catch((err) => {
        if (err.message === 'Auth session not found')
          throw new ForbiddenException('Send auth request first');
        else throw err;
      });

    if (checkAuthCode === false)
      return { status: 'error', msg: 'Wrong auth code' };

    return { status: 'ok' };
  }

  @Get('getOne')
  @Header('Content-Type', 'application/json')
  async getOne(
    @Query() data: { id: number },
    @Session() session: FastifySession,
  ): Promise<User> {
    if ((await this.sessionService.isLoggedIn(session)) !== true)
      throw new ForbiddenException('Access denied');
    if (!data?.id) throw new BadRequestException('User ID is empty');

    return await this.userService.getOne({ id: data.id });
  }
}
