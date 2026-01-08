import type {
  RequestHandlerNextFunction,
  RouterRequest,
  RouterResponse,
} from "@scope/core/router";
import BadRequestException from "../exceptions/bad-request.exception.ts";
import { DEVICE_HASH_HEADER_KEY } from "../consts/e2ee.consts.ts";

/**
 * Context object for the requireDeviceHash middleware.
 */
export type RequireDeviceHashMiddlewareContext<
  TContext = Record<string, unknown>,
> = {
  /**
   * The device hash header.
   */
  deviceHash: string;
} & TContext;

/**
 * Middleware to require a device hash header.
 */
export default function requireDeviceHash(
  req: RouterRequest<
    Record<string, unknown>,
    Record<string, string>,
    RequireDeviceHashMiddlewareContext,
    unknown
  >,
  _res: RouterResponse,
  next: RequestHandlerNextFunction,
) {
  const deviceHash = req._request.headers.get(DEVICE_HASH_HEADER_KEY);

  if (!deviceHash) {
    throw new BadRequestException(
      `The \`${DEVICE_HASH_HEADER_KEY}\` header is required`,
    );
  }

  req.context.deviceHash = deviceHash;

  next();
}
