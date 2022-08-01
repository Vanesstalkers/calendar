import * as nestjs from '@nestjs/common';
import axios from 'axios';
import config from './config';

@nestjs.Injectable()
export class UtilsService {
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
}
