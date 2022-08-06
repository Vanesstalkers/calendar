import * as nestjs from '@nestjs/common';
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

import { TickService } from './tick.service';
import { UtilsService } from '../utils/utils.service';
import { SessionService } from '../session/session.service';

import { createTickDTO, updateTickDTO } from './tick.dto';

@nestjs.Controller('tick')
@nestjs.UseInterceptors(interceptors.PostStatusInterceptor)
@nestjs.UseGuards(decorators.validateSession)
@swagger.ApiTags('tick')
@swagger.ApiResponse({
  status: 400,
  description: 'Формат ответа для всех ошибок',
  type: () => interfaces.response.exception,
})
export class TickController {
  constructor(
    private tickService: TickService,
    private sessionService: SessionService,
    private utils: UtilsService,
  ) {}

  @nestjs.Post('create')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @swagger.ApiBody({ type: createTickDTO })
  @swagger.ApiResponse(new interfaces.response.created())
  async create(@nestjs.Body() data: createTickDTO) {
    const tick = await this.tickService.create(data.taskId, data.tickData);
    return { ...httpAnswer.OK, data: { id: tick.id } };
  }

  @nestjs.Post('update')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiResponse(new interfaces.response.success())
  async update(@nestjs.Body() data: updateTickDTO) {
    await this.validate(data?.tickId);
    await this.tickService.update(data.tickId, data.tickData);
    return httpAnswer.OK;
  }

  @nestjs.Delete('delete/:id')
  @nestjs.UseGuards(decorators.isLoggedIn)
  @nestjs.Header('Content-Type', 'application/json')
  @swagger.ApiResponse(new interfaces.response.success())
  async delete(@nestjs.Param('id') id: string) {
    const tickId = parseInt(id);
    await this.validate(tickId);
    await this.tickService.update(tickId, { delete_time: new Date() });
    return httpAnswer.OK;
  }

  async validate(id: number) {
    if (!id) throw new nestjs.BadRequestException('Tick ID is empty');
    if (!(await this.tickService.checkExists(id)))
      throw new nestjs.BadRequestException(`Tick (id=${id}) does not exist`);
  }
}
