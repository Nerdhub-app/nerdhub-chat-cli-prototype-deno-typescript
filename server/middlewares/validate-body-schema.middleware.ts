import z from "zod";
import type {
  RequestHandlerNextFunction,
  RouterRequest,
  RouterResponse,
} from "@scope/core/router";
import UnprocessableEntityException from "../exceptions/unprocessable-entity.exception.ts";

/**
 * Middleware to validate the request body against a Zod schema.
 *
 * @param schema - The Zod schema to validate the request body against.
 * @returns A middleware function that validates the request body.
 */
export default function validateRequestBodySchema(
  schema: z.ZodObject | z.ZodArray,
) {
  return (
    req: RouterRequest,
    _res: RouterResponse,
    next: RequestHandlerNextFunction,
  ) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new UnprocessableEntityException(error.message, error.issues);
      } else {
        next(error);
      }
    }
  };
}
