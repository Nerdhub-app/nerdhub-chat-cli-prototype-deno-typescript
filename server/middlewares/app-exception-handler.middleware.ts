import AppException from "../helpers/app-exception.helper.ts";
import {
  JSONResponse,
  type MiddlewareNextFn,
  type MiddlewareRequest,
} from "../router.ts";

export default function appExceptionHandler(
  err: unknown,
  _req: MiddlewareRequest,
  next: MiddlewareNextFn,
) {
  if (err instanceof AppException) {
    const body: Record<string, unknown> = {
      message: err.message,
    };
    if (err.code) body.code = err.code;
    if (err.data) body.error = err.data;
    return new JSONResponse(body, err.status);
  }
  next(err);
}
