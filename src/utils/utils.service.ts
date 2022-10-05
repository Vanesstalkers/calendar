import * as nestjs from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize/types';
import axios from 'axios';
import { decorators, interfaces, types, exception } from '../globalImport';

import * as stream from 'stream';
import * as fs from 'node:fs';
import * as util from 'node:util';

import { LoggerService, LoggerServiceSingleton } from '../logger/logger.service';

import { getConfig } from '../config';
const config = getConfig();

@nestjs.Injectable({ scope: nestjs.Scope.DEFAULT })
export class UtilsServiceSingleton {
  constructor(public sequelize: Sequelize, public logger: LoggerServiceSingleton) {}

  validatePhone(phone: string): boolean {
    return !phone || phone.toString().match(/^\d{10}$/) === null;
  }

  randomCode(symbols = '0123456789', length = 4) {
    const result = [];
    for (let i = 0; i < length; i++) result.push(symbols[Math.floor(Math.random() * symbols.length)]);
    return result.join('');
  }

  async sendSMS(phone: string, code: string) {
    const endpoint = '/sms/send';
    const url = config.greensms.url + endpoint;
    const queryParams = { to: phone, txt: code };
    const params = {
      ...queryParams,
      ...config.greensms.account,
    };
    const headers = { 'Content-Type': 'application/json' };
    const result = await axios({ method: 'POST', url, params, headers }).catch((err) => {
      // временно пишем эту ошибку, но нужно добавить проверок отдельно на доступность сервера, и отдельно на несоответствие запроса формату АПИ
      throw new nestjs.ServiceUnavailableException();
    });
    return result;
  }

  async parseMultipart(request) {
    const pump = util.promisify(stream.pipeline);
    const value = {};
    const parts = request.parts();
    for await (const part of parts) {
      if (part.file) {
        const tmpPath = './uploads/' + part.filename;
        await pump(part.file, fs.createWriteStream(tmpPath));
        // const buff = await part.toBuffer()
        // const decoded = Buffer.from(buff.toString(), 'base64').toString()
        // value[part.fieldname] = decoded // set `part.value` to specify the request body value
        value[part.fieldname] = {
          fileName: part.filename,
          fileMimetype: part.mimetype,
          fileExtension: part.filename.split('.').pop(),
          link: tmpPath,
        };
      } else {
        if (part.value[0] === '{') {
          try {
            value[part.fieldname] = JSON.parse(part.value);
          } catch (err) {
            throw new nestjs.BadRequestException({ msg: 'Invalid JSON-data', code: 'DB_BAD_QUERY' });
          }
        } else {
          value[part.fieldname] = part.value;
        }
      }
    }
    return value;
  }

  async queryDB(sql, options?) {
    const startTime = Date.now();
    options.logging = async (fullfilled_sql) => {
      await this.logger.sendLog({
        sql,
        fullfilled_sql: fullfilled_sql.split('): ', 2)[1] || fullfilled_sql,
        replacements: options.replacements,
        execTime: (Date.now() - startTime) / 1000,
      });
    };
    return await this.sequelize.query(sql, options).catch(exception.dbErrorCatcher);
  }

  async updateDB({ table, id, data, handlers = {}, jsonKeys = [], transaction }) {
    const setList = [];
    const replacements = { id };

    if (jsonKeys.includes('config') && process.env.MODE === 'TEST') {
      const fakeConfig = { fake: true };
      if (data.config) {
        data.config = { ...fakeConfig, ...data.config };
      } else {
        data.config = fakeConfig;
      }
    }
    for (const [key, value] of Object.entries(data)) {
      if (key === 'id') continue;

      let replaceValue = value;
      if (handlers[key]) {
        const handlerResult = (await handlers[key](value, transaction)) || {};
        if (handlerResult.preventDefault) continue;
        if (handlerResult.replaceValue) replaceValue = handlerResult.replaceValue;
      }

      if (jsonKeys.includes(key)) {
        if (replaceValue === null) {
          setList.push(`"${key}" = '{}'::jsonb`);
        } else {
          setList.push(`"${key}" = "${key}"::jsonb || :${key}::jsonb`);
          replacements[key] = JSON.stringify(replaceValue);
        }
      } else {
        if (value !== undefined) {
          setList.push(`"${key}" = :${key}`);
          replacements[key] = replaceValue;
        }
      }
    }

    if (setList.length) {
      setList.unshift(`"updateTime" = NOW()`);
      await this.queryDB(`UPDATE "${table}" SET ${setList.join(',')} WHERE id = :id`, {
        replacements,
        transaction,
      });
    }
  }

  async withDBTransaction<T>(
    transaction: Transaction,
    action: (transaction: Transaction) => Promise<void | T>,
  ): Promise<void | T> {
    try {
      const createTransaction = !transaction;
      if (createTransaction) transaction = await this.sequelize.transaction();

      const actionResult = await action(transaction);

      if (createTransaction) await transaction.commit();
      return actionResult;
    } catch (err) {
      if (transaction && !transaction.hasOwnProperty('finished')) await transaction.rollback();
      throw err;
    }
  }
}

@nestjs.Injectable({ scope: nestjs.Scope.REQUEST })
export class UtilsService extends UtilsServiceSingleton {
  constructor(public sequelize: Sequelize, public logger: LoggerService) {
    super(sequelize, logger);
  }
}
