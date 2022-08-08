import * as nestjs from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import axios from 'axios';
import config from '../config';
import {
  decorators,
  interfaces,
  models,
  types,
  exception,
} from '../globalImport';

@nestjs.Injectable()
export class UtilsService {
  constructor(private sequelize: Sequelize) {}

  validatePhone(phone: string): boolean {
    return !phone || phone.toString().match(/^\d{10}$/) === null;
  }

  randomCode(symbols: string = '0123456789', length: number = 4) {
    const result = [];
    for (let i = 0; i < length; i++)
      result.push(symbols[Math.floor(Math.random() * symbols.length)]);
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
    const result = await axios({ method: 'POST', url, params, headers }).catch(
      (err) => {
        // временно пишем эту ошибку, но нужно добавить проверок отдельно на доступность сервера, и отдельно на несоответствие запроса формату АПИ
        throw new nestjs.ServiceUnavailableException();
      },
    );
    return result;
  }

  async updateDB({
    table,
    id,
    data,
    handlers = {},
    jsonKeys = [],
    transaction,
  }) {
    const setList = [];
    const replacements = { id };

    for (const [key, value] of Object.entries(data)) {
      if (key === 'id') continue;
      if (handlers[key]) {
        if (await handlers[key](value, transaction)) continue;
      }

      if (jsonKeys.includes(key)) {
        setList.push(`"${key}" = "${key}"::jsonb || :${key}::jsonb`);
        replacements[key] = JSON.stringify(value);
      } else {
        setList.push(`"${key}" = :${key}`);
        replacements[key] = value;
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
