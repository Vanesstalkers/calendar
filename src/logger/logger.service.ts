import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import * as nestjs from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import * as fastify from 'fastify';
import { REQUEST_CONTEXT_ID } from '@nestjs/core/router/request/request-constants';
import { Db, ObjectID } from 'mongodb';
import { Server, Socket } from 'socket.io';
import { decorators, interfaces, types, exception } from '../globalImport';

@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class LoggerServiceSingleton {
  request = null;
  constructor(@nestjs.Inject('DATABASE_CONNECTION') public db: Db) {}
  traceList = [];
  finalized = false;
  getTraceList() {
    return this.traceList;
  }
  async startLog(request, startType = 'HTTP') {
    this.traceList = [];
    this.finalized = false;
    this.sendLog(
      [
        {
          url: request.url,
          request: {
            ip: request.ip || request.address,
            method: request.method,
            protocol: request.protocol,
            headers: request.headers,
          },
        },
        { startType, requestData: request.body || request.query },
      ],
      /* { request, startType }, */
    );
  }
  async sendLog(
    data: any,
    {
      request = null,
      client = null,
      startType,
      finalizeType,
    }: { request?: fastify.FastifyRequest; client?: Socket; startType?: string; finalizeType?: string } = {},
  ) {
    try {
      const col = new Date().toLocaleString().split(',')[0];
      const processData = Array.isArray(data) ? data : [data];
      const insertData = [];
      for (const processItem of processData) {
        insertData.push(await this.processTraceData(processItem, { request, client, startType, finalizeType }));
      }
      this.traceList.push(...insertData);
      if (finalizeType) {
        this.finalized = true;
        const traceList = this.getTraceList();
        const sqlLogs = traceList.filter((logItem) => logItem.sql);
        const baseLog = traceList.filter((logItem) => !logItem.sql).reduce((acc, item) => ({ ...acc, ...item }), {});
        if (this.db) await this.db.collection(col).insertMany([baseLog, ...sqlLogs]);
        return traceList[0]?.traceId;
      } else if (this.finalized) {
        // сюда попадут части логов, которые записывались в файлы (в случае ошибки запроса к БД они отработают позже)
        if (this.db) await this.db.collection(col).insertMany([...insertData]);
      }
    } catch (err) {
      console.log('sendLog err', err);
    }
  }
  async processTraceData(
    data: any,
    {
      request = null,
      client = null,
      startType,
      finalizeType,
    }: { request?: fastify.FastifyRequest; client?: Socket; startType?: string; finalizeType?: string } = {},
  ) {
    const clientTraceid = client?.id ? client?.id + '-' + client?.handshake?.query.t : undefined;
    const traceId = (this.request || request)?.[REQUEST_CONTEXT_ID]?.id?.toString() || clientTraceid;
    let resultItem = JSON.parse(JSON.stringify(data));
    const check = async (data: object) => {
      for (const [key, val] of Object.entries(data)) {
        if (val && typeof val === 'object') await check(val);
        else if (['sql', 'fullfilled_sql', 'fileContent'].includes(key) && typeof val === 'string' && val.length > 1000)
          data[key] = await this.putIntoLogFile(val, { traceId, key });
      }
    };
    if (typeof resultItem === 'object') {
      await check(resultItem);
      resultItem.traceId = traceId;
      if (startType) {
        resultItem.startTime = new Date();
      } else if (finalizeType) {
        resultItem.endTime = new Date();
      } else {
        resultItem.time = new Date();
      }
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

@nestjs.Injectable({ scope: nestjs.Scope.REQUEST }) // это для наглядности, т.к. из-за @nestjs.Inject(REQUEST) все равно будет scope==REQUEST
export class LoggerService extends LoggerServiceSingleton {
  constructor(
    @nestjs.Inject('DATABASE_CONNECTION') public db: Db,
    @nestjs.Inject(REQUEST) public request: fastify.FastifyRequest,
  ) {
    super(db);
    this.request = request;
  }
}
