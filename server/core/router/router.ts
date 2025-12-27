import type { ConcreteRouterRequest } from "./router-request.ts";
import type {
  GenericRequestErrorHandler,
  GenericRequestProcessingHandler,
  GenericRouterRequest,
  HttpMethod,
  RequestHandlerNextFunction,
  RequestHandlerReturnType,
  RequestProcessingHandlersAndRouterEntryParams,
  RequestProcessingHandlersEntryParams,
  Router,
  RouterResponse,
} from "./router.core.d.ts";
import {
  appendWildcardToRegExpPattern,
  buildRequestParameters,
  getRoutePathnameRegExpPattern,
  isRequestErrorHandler,
  matchRequestPathnameWithRoutePathname,
  normalizeRequestPathname,
  removeEndingDollarSignFromRoutePathnameRegExpPattern,
  removeWildcardParamRegExpPatternFromRoutePathnameRegExpPattern,
  type RoutePathnameParamType,
} from "./router.core.utils.ts";

/**
 * Data associated with the pathname of a request processing handler entry.
 */
type RequestProcessingHandlerEntryPathnameData = {
  /**
   * The original pathname string.
   */
  value: string;
  /**
   * The regular expression pattern matching the pathname.
   */
  regExpPattern: string;
  /**
   * The types of the parameters extracted from the pathname.
   */
  paramsTypes: Record<string, RoutePathnameParamType>;
};

/**
 * An entry representing a list of request processing handlers.
 */
type RequestProcessingHandlersEntry =
  & {
    /**
     * Indicates that this entry is not for error handling.
     */
    isErrorHandler: false;
    /**
     * The HTTP method associated with this entry, or null if it matches any method.
     */
    method: HttpMethod | null;
  }
  & ({
    /**
     * Pathname data is null means this entry matches any pathname.
     */
    pathnameData: null;
    /**
     * The list of handlers.
     */
    handlers: GenericRequestProcessingHandler[];
  } | {
    /**
     * Pathname data for matching specific routes.
     */
    pathnameData: RequestProcessingHandlerEntryPathnameData;
    /**
     * The list of handlers, which may include nested routers.
     */
    handlers: GenericRequestProcessingHandler[] | [
      ...GenericRequestProcessingHandler[],
      Router,
    ];
  });

/**
 * An entry representing a request error handler.
 */
type RequestErrorHandlerEntry = {
  /**
   * Indicates that this entry is for error handling.
   */
  isErrorHandler: true;
  /**
   * The error handler function.
   */
  handler: GenericRequestErrorHandler;
};

/**
 * A generalized entry containing either request processing handlers or an error handler.
 */
type RequestHandlersEntry =
  | RequestProcessingHandlersEntry
  | RequestErrorHandlerEntry;

/**
 * The type of task being performed by the router: either normal processing or handling an error.
 */
type RequestHandlingTaskType = "processing" | "error-handling";

/**
 * Properties passed to a router when it is executed as a handler within another router.
 */
type RootRouterRequestHandlerProps = {
  /**
   * The value of the `routePathname` property of the request object.
   */
  routePathname: string;
  /**
   * The value of the `params` property of the request object.
   */
  params: Record<string, unknown>;
  /**
   * The next function of the root router request handler.
   */
  nextFn: RequestHandlerNextFunction;
  /**
   * The matched request pathname.
   */
  matchedRequestPathname: string;
};

/**
 * Internal state of the `next` function in the request handling loop.
 */
type RequestHandlerNextFunctionState = {
  /**
   * Whether the request should proceed to the next handler (`next()` was called).
   */
  forward: boolean;
  /**
   * The error object if `next` was called with an error.
   */
  error: unknown | null;
};

export default class ConcreteRouter implements Router {
  #requestHandlersEntries: RequestHandlersEntry[] = [];
  get requestHandlersEntries(): readonly RequestHandlersEntry[] {
    return Object.freeze([...this.#requestHandlersEntries]);
  }

  use(
    ...args:
      | [GenericRequestErrorHandler]
      | RequestProcessingHandlersEntryParams
      | [string, ...RequestProcessingHandlersEntryParams]
      | [string, ...RequestProcessingHandlersAndRouterEntryParams]
  ): void {
    const [arg0, ...restArgs] = args;

    // Registering an error handler.
    if (typeof arg0 === "function" && isRequestErrorHandler(arg0)) {
      this.#requestHandlersEntries.push({
        isErrorHandler: true,
        handler: arg0,
      });
    } // Registering a request processing handlers (+ a sub router) entry under a pathname.
    else if (typeof arg0 === "string") {
      const pathname = normalizeRequestPathname(arg0);
      const pathnameRegExpData = getRoutePathnameRegExpPattern(pathname);
      const pathnameData: RequestProcessingHandlerEntryPathnameData = {
        value: pathname,
        regExpPattern: pathnameRegExpData.regExpPattern,
        paramsTypes: pathnameRegExpData.paramsTypes,
      };
      this.#requestHandlersEntries.push({
        isErrorHandler: false,
        method: null,
        pathnameData,
        handlers: restArgs,
      });
    } // Registering a request processing handlers entry.
    else {
      this.#requestHandlersEntries.push({
        isErrorHandler: false,
        method: null,
        pathnameData: null,
        handlers: [arg0, ...(restArgs as GenericRequestProcessingHandler[])],
      });
    }
  }

  /**
   * Registers a request processing handlers entry for a specific HTTP method.
   *
   * @param method HTTP method
   * @param args Request processing handlers entry parameters.
   */
  private registerRequestProcessingHandlersEntryForHttpMethod(
    method: HttpMethod,
    ...args:
      | RequestProcessingHandlersEntryParams
      | [string, ...RequestProcessingHandlersEntryParams]
  ): void {
    const [arg0, ...restArgs] = args;

    // Registering a request processing handlers entry under a pathname.
    if (typeof arg0 === "string") {
      const pathname = normalizeRequestPathname(arg0);
      const pathnameRegExpData = getRoutePathnameRegExpPattern(pathname);
      const pathnameData: RequestProcessingHandlerEntryPathnameData = {
        value: pathname,
        regExpPattern: pathnameRegExpData.regExpPattern,
        paramsTypes: pathnameRegExpData.paramsTypes,
      };
      this.#requestHandlersEntries.push({
        isErrorHandler: false,
        method,
        pathnameData,
        handlers: restArgs,
      });
    } // Registering a request processing handlers entry.
    else {
      this.#requestHandlersEntries.push({
        isErrorHandler: false,
        method,
        pathnameData: null,
        handlers: [arg0, ...(restArgs as GenericRequestProcessingHandler[])],
      });
    }
  }

  get(
    ...args:
      | RequestProcessingHandlersEntryParams
      | [string, ...RequestProcessingHandlersEntryParams]
  ): void {
    this.registerRequestProcessingHandlersEntryForHttpMethod("GET", ...args);
  }

  post(
    ...args:
      | RequestProcessingHandlersEntryParams
      | [string, ...RequestProcessingHandlersEntryParams]
  ): void {
    this.registerRequestProcessingHandlersEntryForHttpMethod("POST", ...args);
  }

  put(
    ...args:
      | RequestProcessingHandlersEntryParams
      | [string, ...RequestProcessingHandlersEntryParams]
  ): void {
    this.registerRequestProcessingHandlersEntryForHttpMethod("PUT", ...args);
  }

  patch(
    ...args:
      | RequestProcessingHandlersEntryParams
      | [string, ...RequestProcessingHandlersEntryParams]
  ): void {
    this.registerRequestProcessingHandlersEntryForHttpMethod("PATCH", ...args);
  }

  delete(
    ...args:
      | RequestProcessingHandlersEntryParams
      | [string, ...RequestProcessingHandlersEntryParams]
  ): void {
    this.registerRequestProcessingHandlersEntryForHttpMethod("DELETE", ...args);
  }

  /**
   * Channels a request through the request handlers.
   *
   * @param request The request to channel.
   * @param response The response to channel.
   * @param rootRouterRequestHandlerProps The root router request handler props.
   * @returns The request handler return type.
   */
  async channelRequestThroughRequestHandlers(
    request: GenericRouterRequest,
    response: RouterResponse<unknown>,
    rootRouterRequestHandlerProps?: RootRouterRequestHandlerProps,
  ): RequestHandlerReturnType<unknown> {
    /**
     * The request as an instance of {@link ConcreteRouterRequest}
     */
    const concreteRequest = request as ConcreteRouterRequest;

    const matchedRequestPathname =
      rootRouterRequestHandlerProps?.matchedRequestPathname ??
        normalizeRequestPathname(concreteRequest.reqPathname);

    /**
     * The next function state.
     */
    const nextFnState: RequestHandlerNextFunctionState = {
      forward: false,
      error: null,
    };
    /**
     * The next function.
     */
    const nextFn: RequestHandlerNextFunction = (error?: unknown) => {
      nextFnState.forward = true;
      nextFnState.error = error;
    };

    // Iterating through the request handlers entries.
    for (const requestHandlersEntry of this.#requestHandlersEntries) {
      /**
       * The current task of the request handling depending on the existence of error in the next function state.
       * If the task is "error-handling", the request handlers entry is an error handler.
       * If the task is "processing", the request handlers entry is a processing handler.
       */
      const taskType: RequestHandlingTaskType =
        typeof nextFnState.error === "undefined" || nextFnState.error === null
          ? "processing"
          : "error-handling";

      // Only the request processing handlers are processed.
      if (taskType === "processing") {
        // Skip when the request handlers entry is an error handler.
        if (requestHandlersEntry.isErrorHandler) continue;
        // Skip when the request handlers entry is not for the current request method.
        if (
          requestHandlersEntry.method &&
          requestHandlersEntry.method !== concreteRequest.method
        ) continue;

        /**
         * The request parameters.
         * If the request handlers entry is a root router request handler, the request parameters are the root router request handler parameters.
         */
        let params: Record<string, unknown> =
          rootRouterRequestHandlerProps?.params ?? {};

        if (requestHandlersEntry.pathnameData) {
          // Building the request pathname regex pattern.
          let pathnameRegExpPattern =
            requestHandlersEntry.pathnameData.regExpPattern;
          // Appending the wildcard to the request pathname regex pattern if the last request handler is a router.
          if (requestHandlersEntry.handlers.at(-1) instanceof ConcreteRouter) {
            pathnameRegExpPattern = appendWildcardToRegExpPattern(
              pathnameRegExpPattern,
            );
          }

          // Matching the request pathname with the route pathname.
          const pathnameRegExpMatches = matchRequestPathnameWithRoutePathname(
            matchedRequestPathname,
            pathnameRegExpPattern,
          );
          // console.log(
          //   `DEBUG: matching "${matchedRequestPathname}" with "${pathnameRegExpPattern}" -> matches:`,
          //   pathnameRegExpMatches,
          // );
          // Skip when the request pathname does not match the route pathname.
          if (!pathnameRegExpMatches) continue;

          // Building the request parameters.
          if (pathnameRegExpMatches.groups) {
            params = {
              ...params,
              ...buildRequestParameters(
                pathnameRegExpMatches.groups,
                requestHandlersEntry.pathnameData.paramsTypes,
              ),
            };
          }

          // Building the request route pathname.
          if (rootRouterRequestHandlerProps?.routePathname) {
            concreteRequest.routePathname =
              rootRouterRequestHandlerProps.routePathname;
          }
          concreteRequest.routePathname +=
            `/${requestHandlersEntry.pathnameData.value}`;
        }

        concreteRequest.params = params;

        // Iterating through the request handlers.
        for (const requestHandler of requestHandlersEntry.handlers) {
          // Resetting the next function state's `forward` property to false so that we know whether the request handler forwarded the request or not.
          nextFnState.forward = false;

          try {
            let requestHandlerReturn: RequestHandlerReturnType<unknown>;
            // Channeling the request through the sub-router.
            if (requestHandler instanceof ConcreteRouter) {
              // The sub-router's matched request pathname should be the request pathname without the current entry without wildcard's matched request pathname.
              const subRouterMatchedRequestPathname = matchedRequestPathname
                .replace(
                  new RegExp(
                    removeEndingDollarSignFromRoutePathnameRegExpPattern(
                      removeWildcardParamRegExpPatternFromRoutePathnameRegExpPattern(
                        requestHandlersEntry.pathnameData!.regExpPattern,
                      ),
                    ),
                  ),
                  "",
                );
              const routerRequestHandlerProps: RootRouterRequestHandlerProps = {
                params,
                routePathname: concreteRequest.routePathname ?? "",
                matchedRequestPathname: subRouterMatchedRequestPathname,
                nextFn,
              };
              requestHandlerReturn = requestHandler
                .channelRequestThroughRequestHandlers(
                  concreteRequest,
                  response,
                  routerRequestHandlerProps,
                );
            } // Invoking the request processing handler.
            else {
              requestHandlerReturn =
                (requestHandler as GenericRequestProcessingHandler)(
                  concreteRequest,
                  response,
                  nextFn,
                );
            }

            const requestHandlerOutput = requestHandlerReturn instanceof Promise
              ? await requestHandlerReturn
              : requestHandlerReturn;

            if (!nextFnState.forward) {
              return requestHandlerOutput;
            } else if (nextFnState.error) {
              // Breaking the loop when the next function was called with an error.
              break;
            }
          } catch (error) {
            // Breaking the loop when an error was thrown while attaching the error to the next function's state.
            nextFn(error);
            break;
          }
        }
      } // Only the request error handlers are processed.
      else if (requestHandlersEntry.isErrorHandler) {
        // Resetting the next function state's `forward` property to false so that we know whether the request handler forwarded the request or not.
        nextFnState.forward = false;

        try {
          // Invoking the request error handler.
          const requestHandlerReturn = requestHandlersEntry.handler(
            nextFnState.error,
            request,
            response,
            nextFn,
          );
          const requestHandlerOutput = requestHandlerReturn instanceof Promise
            ? await requestHandlerReturn
            : requestHandlerReturn;

          if (!nextFnState.forward) {
            return requestHandlerOutput;
          }
        } catch (error) {
          // When an error was thrown, attach it to the next function's state.
          nextFn(error);
        }
      }
    }

    if (rootRouterRequestHandlerProps) {
      // Eventually calling the root router request handler's next function with the local next function's state's error.
      rootRouterRequestHandlerProps.nextFn(nextFnState.error);
    } else if (nextFnState.error) {
      // When the next function was called with an error, attach it to the response.
      throw nextFnState.error;
    } else {
      // When the request is unmatched through the router's entries, throw an error.
      throw new UnmatchedRequestThroughEntriesError();
    }
  }
}

/**
 * Thrown when a request is unmatched through the router's entries.
 */
export class UnmatchedRequestThroughEntriesError extends Error {
  constructor() {
    super("Unmatched request through entries");
  }
}

/**
 * Creates a new router.
 * @returns The new router.
 */
export function createRouter(): Router {
  return new ConcreteRouter();
}
