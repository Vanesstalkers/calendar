import * as nestjs from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import axios from 'axios';
import config from '../config';
import { decorators, interfaces, models, types, exception } from '../globalImport';

import * as stream from 'stream';
import * as fs from 'node:fs';
import * as util from 'node:util';

import { LoggerService } from '../logger/logger.service';

@nestjs.Injectable()
export class UtilsService {
  constructor(private sequelize: Sequelize, private logger: LoggerService) {}

  validatePhone(phone: string): boolean {
    return !phone || phone.toString().match(/^\d{10}$/) === null;
  }

  randomCode(symbols: string = '0123456789', length: number = 4) {
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

  async queryDB(sql, options) {
    this.logger.sendLog({ sql, replacements: options.replacements });
    return await this.sequelize.query(sql, options).catch(exception.dbErrorCatcher);
  }

  async updateDB({ table, id, data, handlers = {}, jsonKeys = [], transaction }) {
    const setList = [];
    const replacements = { id };

    for (const [key, value] of Object.entries(data)) {
      if (key === 'id') continue;

      let replaceValue = value,
        dbHandler = false;
      if (handlers[key]) {
        const handlerResult = (await handlers[key](value, transaction)) || {};
        if (handlerResult.preventDefault) continue;
        if (handlerResult.replaceValue) replaceValue = handlerResult.replaceValue;
        //if (handlerResult.dbHandler) dbHandler = handlerResult.dbHandler;
      }

      if (jsonKeys.includes(key)) {
        setList.push(`"${key}" = "${key}"::jsonb || :${key}::jsonb`);
        replacements[key] = JSON.stringify(replaceValue);
      } else {
        if (value !== undefined) {
          setList.push(`"${key}" = :${key}`);
          replacements[key] = replaceValue;
        }
      }
    }

    if (setList.length) {
      await this.sequelize
        .query(`UPDATE "${table}" SET ${setList.join(',')} WHERE id = :id`, {
          replacements,
          transaction,
        })
        .catch(exception.dbErrorCatcher);
    }
  }
}
