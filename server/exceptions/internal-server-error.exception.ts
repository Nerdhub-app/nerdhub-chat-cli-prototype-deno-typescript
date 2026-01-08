import { HttpResponseStatus } from "@scope/core/router";
import { DEFAULT_INTERNAL_SERVER_ERROR_EXCEPTION_MESSAGE } from "../consts/exceptions.consts.ts";
import RequestException from "./request.exception.ts";

export class InternalServerErrorException extends RequestException {
  constructor(
    message: string = DEFAULT_INTERNAL_SERVER_ERROR_EXCEPTION_MESSAGE,
    data?: unknown,
  ) {
    super(message, HttpResponseStatus.INTERNAL_SERVER_ERROR, data);
  }
}

export default InternalServerErrorException;
