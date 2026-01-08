import type {
  GenericRequestErrorHandler,
  RequestHandlerNextFunction,
  RouterRequest,
  RouterResponse,
} from "@scope/core/router";
import RequestException from "../exceptions/request.exception.ts";

/**
 * Request exception handler middleware
 */
export function requestExceptionHandler(
  err: unknown,
  _req: RouterRequest,
  res: RouterResponse,
  next: RequestHandlerNextFunction,
) {
  if (err instanceof RequestException) {
    return res.setStatus(err.status).json({
      message: err.message,
      data: err.data,
    });
  }
  next(err);
}

requestExceptionHandler satisfies GenericRequestErrorHandler;

export default requestExceptionHandler;
