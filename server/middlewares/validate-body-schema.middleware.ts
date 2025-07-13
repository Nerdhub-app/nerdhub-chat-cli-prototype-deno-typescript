import z from "zod";
import {
  HttpReponseStatus,
  type MiddlewareNextFn,
  type MiddlewareRequest,
  type RequestNormalMiddleware,
} from "../router.ts";
import AppException from "../helpers/app-exception.helper.ts";

export default function validateRequestBodySchema(
  schema: z.ZodObject,
): RequestNormalMiddleware {
  return (req: MiddlewareRequest, next: MiddlewareNextFn) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppException({
          status: HttpReponseStatus.UNPROCESSABLE_ENTITY,
          message: "Request body validation failed",
          data: error.issues,
        });
      } else {
        next(error);
      }
    }
  };
}
