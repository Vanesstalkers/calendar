import * as nestjs from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import * as fastify from 'fastify';
import { Session as FastifySession } from '@fastify/secure-session';
import { decorators, interfaces, models, types, httpAnswer, interceptors } from '../globalImport';

import * as lstPhoneCode from '../lst/phoneCode.json';
import * as lstTimezone from '../lst/timezone.json';

import { UtilsService } from './utils.service';
import { SessionService } from '../session/session.service';

import {
  searchPhoneCodeQueryDTO,
  searchPhoneCodeAnswerDTO,
  searchTimezoneCodeQueryDTO,
  searchTimezoneCodeAnswerDTO,
} from './utils.dto';

@nestjs.Controller('utils')
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@nestjs.UseGuards(decorators.validateSession)
@swagger.ApiTags('utils')
@swagger.ApiResponse({ status: 400, description: 'Формат ответа для всех ошибок', type: interfaces.response.exception })
@swagger.ApiExtraModels(
  searchPhoneCodeQueryDTO,
  searchPhoneCodeAnswerDTO,
  searchTimezoneCodeQueryDTO,
  searchTimezoneCodeAnswerDTO,
)
export class UtilsController {
  constructor(private utilsService: UtilsService) {}

  @nestjs.Get('searchPhoneCode')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiResponse(new interfaces.response.search({ model: searchPhoneCodeAnswerDTO }))
  async searchPhoneCode(@nestjs.Query() data: searchPhoneCodeQueryDTO) {
    const query = data.query.toLocaleLowerCase();
    const limit = parseInt(data.limit) || 50;
    const offset = parseInt(data.offset) || 0;
    const result = Object.entries(lstPhoneCode)
      .filter(([key, value]) => value.name && value.name.toLocaleLowerCase().startsWith(query))
      .splice(offset, limit + 1)
      .map((item) => item[1]);

    let endOfList = false;
    if (result.length < limit + 1) endOfList = true;
    else result.pop();
    return { ...httpAnswer.OK, data: result, endOfList };
  }

  @nestjs.Get('searchTimezone')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiResponse(new interfaces.response.search({ model: searchTimezoneCodeAnswerDTO }))
  async searchTimezone(@nestjs.Query() data: searchTimezoneCodeQueryDTO) {
    const query = data.query.toLocaleLowerCase();
    const limit = parseInt(data.limit) || 50;
    const offset = parseInt(data.offset) || 0;
    const result = Object.entries(lstTimezone)
      .filter(([key, value]) => value.name && value.name.toLocaleLowerCase().startsWith(query))
      .splice(offset, limit + 1)
      .map((item) => item[1]);

      let endOfList = false;
      if (result.length < limit + 1) endOfList = true;
      else result.pop();
      return { ...httpAnswer.OK, data: result, endOfList };
  }
}
