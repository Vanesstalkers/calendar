export interface userAuthQueryParamsI {
  disableTimeout?: boolean;
  preventSendSms?: boolean;
  phone?: string | null;
  cookie?: string | null;
}

export interface authQueryUserDataI {
  phone?: string;
  name: string;
  timezone: string;
  config: {
    phoneCode: string;
  };
}
