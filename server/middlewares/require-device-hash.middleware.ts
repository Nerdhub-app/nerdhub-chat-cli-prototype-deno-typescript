import AppException from "../helpers/app-exception.helper.ts";
import {
  HttpReponseStatus,
  type MiddlewareNextFn,
  type MiddlewareRequest,
} from "../router.ts";
import type { RequestDeviceHashContext } from "../server.d.ts";

export default function requireDeviceHash(
  req: MiddlewareRequest,
  next: MiddlewareNextFn,
) {
  const deviceHash = req.request.headers.get("X-Device-Hash");

  if (!deviceHash) {
    next(
      new AppException({
        message: "The `X-Device-Hash` header is required",
        status: HttpReponseStatus.BAD_REQUEST,
      }),
    );
    return;
  }

  const context = req.context as RequestDeviceHashContext;
  context.deviceHash = deviceHash;

  next();
}
