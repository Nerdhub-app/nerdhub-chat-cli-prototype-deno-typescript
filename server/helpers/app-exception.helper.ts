import type { HttpReponseStatus } from "../router.ts";

export type AppExceptionArgs<TData = unknown> = {
  code?: string | number;
  message: string;
  data?: TData;
  status: HttpReponseStatus;
};

export default class AppException<TData = unknown> extends Error {
  public readonly code?: string | number;
  public readonly data?: TData;
  public readonly status?: HttpReponseStatus;

  constructor(args: AppExceptionArgs<TData>) {
    super(args.message);
    this.code = args.code;
    this.data = args.data;
    this.status = args.status;
  }
}
