import { HttpResponseStatus } from "@scope/core/router";
import RequestException from "./request.exception.ts";
import { DEFAULT_NOT_FOUND_EXCEPTION_MESSAGE } from "../consts/exceptions.consts.ts";

export class NotFoundException extends RequestException {
  constructor(
    message: string = DEFAULT_NOT_FOUND_EXCEPTION_MESSAGE,
    data?: unknown,
  ) {
    super(message, HttpResponseStatus.NOT_FOUND, data);
  }
}

export default NotFoundException;
