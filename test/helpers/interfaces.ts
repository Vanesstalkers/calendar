export interface userAuthBuildParamsI {
  disableTimeout?: boolean;
  preventSendSms?: boolean;
  phone?: string | null;
  cookie?: string | null;
  name?: string;
  timezone?: string;
  phoneCode?: string;
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

export interface userSearchBuildParamsI {
  queryStr?: any;
  globalSearch?: any;
  limit?: any;
  offset?: any;
  cookie?: string;
}
