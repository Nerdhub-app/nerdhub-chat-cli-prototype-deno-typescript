import { DEFAULT_UNPROCESSABLE_ENTITY_EXCEPTION_MESSAGE } from "../consts/exceptions.consts.ts";
import { HttpResponseStatus } from "@scope/core/router";
import RequestException from "./request.exception.ts";

export class UnprocessableEntityException extends RequestException {
  constructor(
    message: string = DEFAULT_UNPROCESSABLE_ENTITY_EXCEPTION_MESSAGE,
    data?: unknown,
  ) {
    super(message, HttpResponseStatus.UNPROCESSABLE_ENTITY, data);
  }
}

export default UnprocessableEntityException;
