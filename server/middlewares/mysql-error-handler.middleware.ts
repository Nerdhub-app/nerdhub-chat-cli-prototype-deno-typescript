import type {
  RequestHandlerNextFunction,
  RouterRequest,
  RouterResponse,
} from "@scope/core/router";
import InternalServerErrorException from "../exceptions/internal-server-error.exception.ts";

interface MySQLError extends Error {
  code: string;
  errno: number;
  sqlState: string;
}

function isMySQLError(error: unknown): error is MySQLError {
  return error instanceof Error && "code" in error && "errno" in error &&
    typeof error.errno === "number" && "sqlState" in error;
}

/**
 * Handles MySQL-related errors
 */
export function mysqlErrorHandler(
  error: unknown,
  _req: RouterRequest,
  _res: RouterResponse,
  next: RequestHandlerNextFunction,
) {
  if (isMySQLError(error)) {
    throw new InternalServerErrorException(error.message, {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
    });
  }
  next(error);
}

export default mysqlErrorHandler;
