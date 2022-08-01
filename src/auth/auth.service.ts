import * as nestjs from '@nestjs/common';
import { UtilsService } from '../utils.service';

@nestjs.Injectable()
export class AuthService {
  private authSessions = {};
  constructor(private utils: UtilsService) {}

  async runAuthWithPhone(
    phone: string,
    successHandler: () => Promise<void>,
    preventSendSms: boolean | string = false,
  ) {
    const code = this.utils.randomCode();

    const smsProviderResult = preventSendSms
      ? { data: {} }
      : await this.utils.sendSMS(phone, code);
    this.authSessions[phone] = {
      authCode: code,
      successHandler,
      smsProviderData: smsProviderResult.data,
    };

    return code;
  }

  async checkAuthCode(phone: string, code: string): Promise<boolean> {
    if (!this.authSessions[phone]) throw new Error('Auth session not found');

    const check = code === this.authSessions[phone].authCode;
    if (!check) {
      return false;
    } else {
      if (this.authSessions[phone].successHandler)
        await this.authSessions[phone].successHandler();
      delete this.authSessions[phone];
      return true;
    }
  }
}
