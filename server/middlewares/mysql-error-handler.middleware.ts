import {
  HttpReponseStatus,
  JSONResponse,
  type MiddlewareNextFn,
  type MiddlewareRequest,
} from "../router.ts";

interface MySQLError extends Error {
  code: string;
  errno: number;
  sqlState: string;
}

function isMySQLError(error: unknown): error is MySQLError {
  return error instanceof Error && "code" in error && "errno" in error &&
    typeof error.errno === "number" && "sqlState" in error;
}

export default function mysqlErrorHandler(
  error: unknown,
  _req: MiddlewareRequest,
  next: MiddlewareNextFn,
) {
  if (isMySQLError(error)) {
    return new JSONResponse({
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
    }, HttpReponseStatus.INTERNAL_SERVER_ERROR);
  }
  next(error);
}
