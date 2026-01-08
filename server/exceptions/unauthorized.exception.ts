import { HttpResponseStatus } from "@scope/core/router";
import { DEFAULT_UNAUTHORIZED_EXCEPTION_MESSAGE } from "../consts/exceptions.consts.ts";
import RequestException from "./request.exception.ts";

export class UnauthorizedException extends RequestException {
  constructor(
    message: string = DEFAULT_UNAUTHORIZED_EXCEPTION_MESSAGE,
    data?: unknown,
  ) {
    super(message, HttpResponseStatus.UNAUTHORIZED, data);
  }
}

export default UnauthorizedException;
