export interface userAuthBuildParamsI {
  disableTimeout?: boolean;
  preventSendSms?: boolean;
  phone?: string | null;
  cookie?: string | null;
}

export interface userCodeBuildParamsI {
  code?: string;
  cookie?: string;
}

export interface authQueryUserDataI {
  phone?: string;
  name: string;
  timezone: string;
  config: {
    phoneCode: string;
    fake: boolean;
  };
}
