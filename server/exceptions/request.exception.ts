import type { HttpResponseStatus } from "@scope/core/router";

/**
 * Base class for request exceptions
 */
export abstract class RequestException extends Error {
  readonly status!: HttpResponseStatus;

  readonly data?: unknown;

  constructor(message: string, status: HttpResponseStatus, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export default RequestException;
