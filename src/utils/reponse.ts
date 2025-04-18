import { StatusCode } from '../types/response';

export class ResponseUtils {
  static success<T>(
    res: any,
    data: T,
    message = 'Success',
    code = StatusCode.OK,
  ): void {
    res.status(code).json({ message, data });
  }

  static error(
    res: any,
    message = 'An error occurred',
    code = StatusCode.INTERNAL_SERVER_ERROR,
    data: any = null,
  ): void {
    res.status(code).json({ message, data });
  }
}
