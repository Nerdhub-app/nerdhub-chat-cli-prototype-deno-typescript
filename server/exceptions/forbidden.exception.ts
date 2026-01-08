import { HttpResponseStatus } from "@scope/core/router";
import RequestException from "./request.exception.ts";
import { DEFAULT_FORBIDDEN_EXCEPTION_MESSAGE } from "../consts/exceptions.consts.ts";

export class ForbiddenException extends RequestException {
  constructor(
    message: string = DEFAULT_FORBIDDEN_EXCEPTION_MESSAGE,
    data?: unknown,
  ) {
    super(message, HttpResponseStatus.FORBIDDEN, data);
  }
}

export default ForbiddenException;
