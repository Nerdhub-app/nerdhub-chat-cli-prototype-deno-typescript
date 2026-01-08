import type {
  GenericRequestErrorHandler,
  GenericRequestProcessingHandler,
} from "./index.ts";
import ConcreteRouterRequest from "./router-request.ts";
import type { HttpResponseStatus } from "./router.core.const.ts";
import type { RouterRequest } from "./router.core.d.ts";

/**
 * A tuple containing the new parameter name and resolved value.
 */
export type RequestParameterBinderResolved<
  TNewResolvedParamName extends string,
  TResolvedValue,
> = [TNewResolvedParamName, TResolvedValue];

/**
 * Binds a request parameter to a new parameter name and value.
 * @param paramName The name of the request parameter to bind.
 * @param resolver A function that resolves the request parameter to a new parameter name and value.
 * @returns A decorator function that can be used to bind the request parameter.
 */
export function bindRequestParameter<
  TNewResolvedParamName extends string,
  TResolvedValue,
>(
  paramName: string,
  resolver: (
    value: unknown,
  ) =>
    | RequestParameterBinderResolved<TNewResolvedParamName, TResolvedValue>
    | Promise<
      RequestParameterBinderResolved<TNewResolvedParamName, TResolvedValue>
    >,
) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    // Rewrite the method to bind the request parameter.
    descriptor.value = async function (
      ...args:
        | Parameters<GenericRequestProcessingHandler>
        | Parameters<GenericRequestErrorHandler>
    ) {
      let requestParams: Record<string, unknown> | null = null;
      if (args[0] instanceof ConcreteRouterRequest) {
        requestParams = args[0].params;
      } else if (args[1] instanceof ConcreteRouterRequest) {
        requestParams = args[1].params;
      }
      if (requestParams) {
        const returnValue = resolver(requestParams[paramName]);
        const [newParamName, resolvedValue] = returnValue instanceof Promise
          ? await returnValue
          : returnValue;
        requestParams[newParamName] = resolvedValue;
      }
      return originalMethod.apply(this, [...args]);
    };
  };
}

/**
 * A type that represents the request parameters after binding a new parameter.
 */
export type BindedRequestParameters<
  TNewRequestParamName extends string,
  TResolvedValue,
  TRequestParams = Record<string, unknown>,
> = TRequestParams & { [key in TNewRequestParamName]: TResolvedValue };

/**
 * Sets the HTTP response status code for a request handler.
 * @param status The HTTP response status code to set.
 * @returns A decorator function that can be used to set the HTTP response status code.
 */
export function setHttpResponseStatus(status: HttpResponseStatus) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    descriptor.value.httpResponseStatus = status;
  };
}

/**
 * Runs a callback that can access the request object before the request handler is executed.
 * @param callback A callback function that is called before the request handler.
 * @returns A decorator function that can be used to run a callback that can access the request object before the request handler is executed.
 */
export function onRequest<
  TParams extends Record<string, unknown>,
  TQuery extends Record<string, string>,
  TContext,
  TBody,
>(
  callback: (
    request: RouterRequest<TParams, TQuery, TContext, TBody>,
  ) => void | Promise<void>,
) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    // Rewrite the method to bind the request parameter.
    descriptor.value = async function (
      ...args:
        | Parameters<GenericRequestProcessingHandler>
        | Parameters<GenericRequestErrorHandler>
    ) {
      let request: RouterRequest<TParams, TQuery, TContext, TBody> | null =
        null;
      if (args[0] instanceof ConcreteRouterRequest) {
        request = args[0];
      } else if (args[1] instanceof ConcreteRouterRequest) {
        request = args[1];
      }
      if (request) {
        const returnValue = callback(request);
        if (returnValue instanceof Promise) {
          await returnValue;
        }
      }
      return originalMethod.apply(this, [...args]);
    };
  };
}
