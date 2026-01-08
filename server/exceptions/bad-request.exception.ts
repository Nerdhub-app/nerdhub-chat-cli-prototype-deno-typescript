import { HttpResponseStatus } from "@scope/core/router";
import RequestException from "./request.exception.ts";
import { DEFAULT_BAD_REQUEST_EXCEPTION_MESSAGE } from "../consts/exceptions.consts.ts";

export class BadRequestException extends RequestException {
  constructor(
    message: string = DEFAULT_BAD_REQUEST_EXCEPTION_MESSAGE,
    data?: unknown,
  ) {
    super(message, HttpResponseStatus.BAD_REQUEST, data);
  }
}

export default BadRequestException;
