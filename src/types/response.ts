export type APIResponseType<T = any> = {
  message: string;
  data: T;
};

export enum StatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  REDIRECT = 301,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  ALREADY_EXISTS = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
  UNKNOWN_ERROR = 999,
}