import { NestFastifyApplication } from '@nestjs/platform-fastify';

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

export interface updateQueryUserDataI {
  phone?: string;
  name?: string;
  timezone?: string;
  config?: {
    phoneCode?: string;
    fake?: boolean;
  };
}

export interface updateQueryIconFileI {
  fileContent?: string | null;
  fileMimetype?: string | null;
  fileName?: string | null;
  fileExtension?: string | null;
  link?: string | null;
}

export interface userUpdateBuildParamsI extends updateQueryIconFileI {
  phone?: string | null;
  cookie?: string | null;
  name?: string;
  timezone?: string;
  phoneCode?: string;
  isIconFile?: boolean;
  isIconFileNull?: boolean;
  userId?: string | null;
  withFormdata?: boolean;
}

export interface payloadArrItemI {
  [index: number]: {
    [index: number]: string | null | updateQueryUserDataI | updateQueryIconFileI;
  };
}

export interface creteOrGetUserI extends userAuthBuildParamsI {
  app: NestFastifyApplication;
}
