import * as nestjs from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import * as fastify from 'fastify';
import * as sequelize from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { REQUEST_CONTEXT_ID } from '@nestjs/core/router/request/request-constants';
import { Db, ObjectID } from 'mongodb';
import { decorators, interfaces, models, types, exception } from '../globalImport';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';

@nestjs.Injectable()
export class LoggerService {
  constructor(
    @nestjs.Inject(REQUEST) private request: fastify.FastifyRequest,
    @nestjs.Inject('DATABASE_CONNECTION') private db: Db,
  ) {}
  async sendLog(data: any, { request = null }: { request?: fastify.FastifyRequest } = {}) {
    try {
      const col = new Date().toLocaleString().split(',')[0];
      const processData = Array.isArray(data) ? data : [data];
      const insertData = [];
      for (const processItem of processData) {
        insertData.push(await this.processTraceData(processItem, request));
      }
      await this.db.collection(col).insertMany(insertData);
    } catch (err) {
      console.log('sendLog err', err);
    }
  }
  async processTraceData(data: any, request: fastify.FastifyRequest) {
    const traceId = (this.request || request)?.[REQUEST_CONTEXT_ID]?.id;
    let resultItem = JSON.parse(JSON.stringify(data));
    const check = async (data: object) => {
      for (const [key, val] of Object.entries(data)) {
        if (val && typeof val === 'object') await check(val);
        else if (['sql', 'fileContent'].includes(key) && typeof val === 'string' && val.length > 100)
          data[key] = await this.putIntoLogFile(val, { traceId, key });
      }
    };
    if (typeof resultItem === 'object') {
      await check(resultItem);
      resultItem.traceId = traceId;
      resultItem.time = new Date();
    } else {
    }
    return resultItem;
  }
  async putIntoLogFile(data: string, { traceId, key }: { traceId: any; key?: string }) {
    const uploadDir = 'logFiles';
    const now = new Date();
    let path = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), traceId].join(
      '/',
    );
    const checkPath = uploadDir + '/' + path;
    if (!(await fs.promises.stat(checkPath).catch(() => false)))
      await fs.promises.mkdir(checkPath, { recursive: true });

    const fullPath = uploadDir + '/' + path + '/' + (key || '') + crypto.createHash('md5').update(data).digest('hex');
    await fs.promises.writeFile(fullPath, data).catch(exception.fsErrorCatcher);

    return fullPath;
  }
}
