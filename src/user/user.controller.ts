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
import User from '../entity/user';

@Controller('user')
export class UserController {
  constructor(
    private userService: UserService,
    private sessionService: SessionService,
    private authService: AuthService,
    private utils: UtilsService,
  ) {}

  @Post('registration')
  async registration(@Body() data: User, @Session() session: FastifySession) {
    if (this.utils.validatePhone(data?.phone))
      throw new BadRequestException('Phone number is incorrect');
      
    const code = await this.authService
      .runAuthWithPhone(data.phone, async () => {
        this.userService.create(data);
        session.registration = true;
      })
      .catch((err) => {
        throw err;
      });

    await this.sessionService.updateStorage(session, { phone: data.phone });
    return { status: 'ok', msg: 'wait for auth code', code }; // !!! убрать code после отладки
  }

  @Get('session')
  @Header('Content-Type', 'application/json')
  session(
    @Session() session: FastifySession,
  ): SessionI {
    return this.sessionService.getState(session);
  }

  @Get('login')
  @Header('Content-Type', 'application/json')
  async login(
    @Query() data: { phone: string },
    @Session() session: FastifySession,
  ) {
    if (this.utils.validatePhone(data?.phone))
      throw new BadRequestException('Phone number is incorrect');

    await this.authService
      .runAuthWithPhone(data.phone, async () => {
        session.login = true;
      })
      .catch((err) => {
        throw err;
      });

    await this.sessionService.updateStorage(session, { phone: data.phone });
    return { status: 'ok', msg: 'wait for auth code' };
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
    // @Session() session: FastifySession,
  ): Promise<User> {
    if (!data?.id) throw new BadRequestException('User ID is empty');
    return await this.userService.getOne(data.id);
  }
}
