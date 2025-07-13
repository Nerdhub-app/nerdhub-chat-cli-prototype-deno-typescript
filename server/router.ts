//===================================================================
// #region Types
//===================================================================

type MaybePromise<T> = T | Promise<T>;

export enum HttpReponseStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  UNSUPPORTED_MEDIA_TYPE = 415,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
}

export class JSONResponse {
  response!: Response;

  constructor(body: object, status: HttpReponseStatus = HttpReponseStatus.OK) {
    const response = formatMiddlewareResponse(body, status);
    this.response = response;
  }
}

type MiddlewareResponse =
  | Response
  | JSONResponse
  | string
  | number
  | boolean
  | object
  | void;

export type MiddlewareNextFn = (error?: unknown) => void;

export class MiddlewareRequest<
  TRequestParams extends Record<string, string> = Record<string, string>,
  TQueryParams extends Record<string, string> = Record<string, string>,
  TContext extends object = Record<string, unknown>,
  TBody = unknown,
> {
  request!: Request;
  params!: TRequestParams;
  query!: TQueryParams;
  context!: TContext;
  body: TBody;

  constructor(
    request: Request,
    params: TRequestParams,
    query: TQueryParams,
    context: TContext,
    body: TBody,
  ) {
    this.request = request;
    this.params = params;
    this.query = query;
    this.context = context;
    this.body = body;
  }
}

export interface RequestNormalMiddleware extends Function {
  status?: HttpReponseStatus;
  (
    request: MiddlewareRequest,
    next: MiddlewareNextFn,
  ): MaybePromise<MiddlewareResponse>;
}

export interface RequestErrorHandlerMiddleware extends Function {
  status?: HttpReponseStatus;
  (
    error: unknown,
    request: MiddlewareRequest,
    next: MiddlewareNextFn,
  ): MaybePromise<MiddlewareResponse>;
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type MiddlewaresEntry = {
  isErrorHandler: false;
  method: HttpMethod | null;
  pathname: string | null;
  pathnameRegExpPattern: string | null;
  middlewares: RequestNormalMiddleware[];
} | {
  isErrorHandler: true;
  middleware: RequestErrorHandlerMiddleware;
};

type UseMiddlewaresChainRegistererParams = [RequestErrorHandlerMiddleware] | [
  string,
  RequestNormalMiddleware,
  ...RequestNormalMiddleware[],
] | [RequestNormalMiddleware, ...RequestNormalMiddleware[]];

// #endregion

//===================================================================
// #region Router class
//===================================================================

/**
 * The router object for handling requests.
 */
export class Router {
  #middlewaresChain: MiddlewaresEntry[];

  constructor() {
    this.#middlewaresChain = [];
    this.handleRequest = this.handleRequest.bind(this);
  }

  /**
   * Registers an entry of processing middlewares or an error handler middleware.
   * It can be restricted to a pathname and is allowed for any HTTP method.
   *
   * @param params An optional pathname as the first argument, and a rest of processing middlewares, or an error handler middleware.
   */
  use(...params: UseMiddlewaresChainRegistererParams) {
    const [arg0, ...args] = params;
    if (typeof arg0 === "function" && arg0.length === 3) {
      this.#middlewaresChain.push({
        isErrorHandler: true,
        middleware: arg0 as RequestErrorHandlerMiddleware,
      });
    } else {
      const pathname = typeof arg0 === "string" ? arg0 : null;
      const pathnameRegExpPattern = pathname
        ? getRoutePathnameRegExpPattern(normalizeRequestPathname(pathname))
        : null;
      const middlewares = typeof arg0 === "string"
        ? args as RequestNormalMiddleware[]
        : params as RequestNormalMiddleware[];
      this.#middlewaresChain.push({
        isErrorHandler: false,
        method: null,
        pathname,
        pathnameRegExpPattern,
        middlewares,
      });
    }
  }

  private registerMiddlewaresChainForHttpMethod(
    httpMethod: HttpMethod,
    pathname: string,
    ...middlewares: [RequestNormalMiddleware, ...RequestNormalMiddleware[]]
  ) {
    const pathnameRegExpPattern = getRoutePathnameRegExpPattern(
      normalizeRequestPathname(pathname),
    );
    this.#middlewaresChain.push({
      isErrorHandler: false,
      method: httpMethod,
      pathname,
      pathnameRegExpPattern,
      middlewares,
    });
  }

  get(
    path: string,
    ...middlewares: [RequestNormalMiddleware, ...RequestNormalMiddleware[]]
  ) {
    this.registerMiddlewaresChainForHttpMethod("GET", path, ...middlewares);
  }

  post(
    path: string,
    ...middlewares: [RequestNormalMiddleware, ...RequestNormalMiddleware[]]
  ) {
    this.registerMiddlewaresChainForHttpMethod("POST", path, ...middlewares);
  }

  put(
    path: string,
    ...middlewares: [RequestNormalMiddleware, ...RequestNormalMiddleware[]]
  ) {
    this.registerMiddlewaresChainForHttpMethod("PUT", path, ...middlewares);
  }

  patch(
    path: string,
    ...middlewares: [RequestNormalMiddleware, ...RequestNormalMiddleware[]]
  ) {
    this.registerMiddlewaresChainForHttpMethod("PATCH", path, ...middlewares);
  }

  delete(
    path: string,
    ...middlewares: [RequestNormalMiddleware, ...RequestNormalMiddleware[]]
  ) {
    this.registerMiddlewaresChainForHttpMethod("DELETE", path, ...middlewares);
  }

  private defaultProcessingMiddleware: RequestNormalMiddleware = (
    _request,
    _next,
  ) => {
    return new JSONResponse(
      { message: `Route not found` },
      HttpReponseStatus.NOT_FOUND,
    );
  };

  private defaultErrorHandlingMiddleware: RequestErrorHandlerMiddleware = (
    error,
    _request,
    _next,
  ) => {
    console.log(error);
    const body: Record<string, unknown> = {
      message: "An unexpected error occurred",
      error,
    };
    return new JSONResponse(body, HttpReponseStatus.INTERNAL_SERVER_ERROR);
  };

  /**
   * Handles the request throughout the middlewares chain.
   *
   * @param request The incoming request object.
   * @returns The response
   */
  private async handleRequest(request: Request): Promise<Response> {
    let forwardNext: boolean = false;
    let nextErr: unknown = null;
    let workType: "processing" | "error_handling" = "processing";

    /**
     * Forwards the request to the next middleware.
     *
     * @param err Error data. If not provided, the request is forwarded to the next processing middleware. Otherwise, it is forwarded to the next error handler middleware.
     */
    function nextFn(err?: unknown) {
      nextErr = err || null;
      forwardNext = true;
    }

    const method: HttpMethod = request.method as HttpMethod;
    const requestURL = new URL(request.url);
    const { pathname } = requestURL;
    const queryParams: Record<string, string> = {};
    for (const [key, value] of requestURL.searchParams) {
      queryParams[key] = value;
    }
    const reqContext: Record<string, unknown> = {};
    let reqBody: object | null = null;
    if (request.body) {
      if (!request.headers.get("Content-Type")?.includes("application/json")) {
        const { response } = new JSONResponse({
          message: "Only the 'application/json' content-type is allowed",
        }, HttpReponseStatus.UNSUPPORTED_MEDIA_TYPE);
        return response;
      }
      try {
        reqBody = await request.json();
      } catch (_) {
        const { response } = new JSONResponse({
          message: "Failed to parse the request body into JSON",
        }, HttpReponseStatus.BAD_REQUEST);
        return response;
      }
    }
    let middlewareRequest: MiddlewareRequest | null = null;

    for (const middlewaresEntry of this.#middlewaresChain) {
      workType = nextErr ? "error_handling" : "processing";
      if (forwardNext) forwardNext = false;

      try {
        // Set to process the request ...
        if (workType === "processing") {
          // Checks for skipping the current middlewares entry
          if (middlewaresEntry.isErrorHandler) continue;
          if (
            middlewaresEntry.method && middlewaresEntry.method !== method
          ) continue;
          const routeParamsMatches =
            middlewaresEntry.pathname && middlewaresEntry.pathnameRegExpPattern
              ? requestPathnameMatchesRoutePathname(
                pathname,
                middlewaresEntry.pathnameRegExpPattern,
              )
              : null;
          if (middlewaresEntry.pathname && !routeParamsMatches) continue;

          // Middleware request instance creation
          if (routeParamsMatches?.groups) {
            const requestParams: Record<string, string> =
              routeParamsMatches.groups;
            middlewareRequest = new MiddlewareRequest(
              request,
              requestParams,
              queryParams,
              reqContext,
              reqBody,
            );
          } else if (!middlewareRequest) {
            const requestParams: Record<string, string> = {}; // Empty request parameters
            middlewareRequest = new MiddlewareRequest(
              request,
              requestParams,
              queryParams,
              reqContext,
              reqBody,
            );
          }

          // Middlewares execution
          for (const middleware of middlewaresEntry.middlewares) {
            if (forwardNext) forwardNext = false;

            const result = middleware(middlewareRequest, nextFn);
            const middlewareResponse = result instanceof Promise
              ? await result
              : result;

            // Forward to next middlware
            if (forwardNext) {
              // If an error was provided, set the work type to error handling and break out of the middlewares chain
              if (nextErr) break;
              // Otherwise, hop onto the next middleware down the chain
              else continue;
            }

            const responseStatus = middleware.status ?? HttpReponseStatus.OK;
            return formatMiddlewareResponse(
              middlewareResponse,
              responseStatus,
            );
          }
        } // Set to handle errors ...
        else {
          if (!middlewaresEntry.isErrorHandler) continue;

          const err = nextErr;
          nextErr = null; // The forwarded is discared before executing the error handler

          const result = middlewaresEntry.middleware(
            err,
            middlewareRequest!,
            nextFn,
          );
          const middlewareResponse = result instanceof Promise
            ? await result
            : result;

          // Forward to next middleware, both processing and error handler middlewares
          if (forwardNext) continue;

          const responseStatus = middlewaresEntry.middleware.status ??
            HttpReponseStatus.INTERNAL_SERVER_ERROR;
          return formatMiddlewareResponse(
            middlewareResponse,
            responseStatus,
          );
        }
      } catch (error) {
        // If any uncaught error was thrown, forward to the next error handler middleware
        nextErr = error;
        continue;
      }
    }

    // Default middleware execution if none of the middlewares in chain did intercept the request
    workType = nextErr ? "error_handling" : "processing";
    const result = workType === "processing"
      ? this.defaultProcessingMiddleware(
        middlewareRequest!,
        nextFn,
      )
      : this.defaultErrorHandlingMiddleware(
        nextErr,
        middlewareRequest!,
        nextFn,
      );
    const middlewareResponse = result instanceof Promise
      ? await result
      : result;
    const responseStatus = workType === "processing"
      ? HttpReponseStatus.OK
      : HttpReponseStatus.INTERNAL_SERVER_ERROR;
    return formatMiddlewareResponse(
      middlewareResponse,
      responseStatus,
    );
  }

  /**
   * Listens the server at a given port.
   *
   * @param port The network port of the HTTP server.
   * @param cb Callback after listening to the port
   */
  listen(port: string | number, cb?: () => void) {
    Deno.serve({ port: Number(port) }, this.handleRequest);
    cb && cb();
  }
}

/**
 * Factory function for the router.
 *
 * @returns The router instance
 */
export default function createRouter() {
  return new Router();
}

// #endregion

//===================================================================
// #region Utility functions
//===================================================================

function normalizeRequestPathname(pathname: string): string {
  return pathname.replace(/^\/?/, "").replace(/\/*?/, "");
}

function getRoutePathnameRegExpPattern(normRoutePathname: string): string {
  let pathnameRegExpPattern = "^";
  const PARAM_NAME_REGEXP_PATTERN = ":[a-zA-Z_][a-zA-Z0-9_]*";
  const routeParamNamesMatches = [...normRoutePathname.matchAll(
    new RegExp(PARAM_NAME_REGEXP_PATTERN, "g"),
  )];
  if (routeParamNamesMatches.length === 0) {
    pathnameRegExpPattern += normRoutePathname + "$";
    return pathnameRegExpPattern;
  }
  let endOfMatchIndex = 0;
  const ROUTE_PATHNAME_PARAM_REGEXP_PATTERN = "[a-zA-Z0-9]+";
  for (const matches of routeParamNamesMatches) {
    const [match] = matches;
    const paramName = match.slice(1);
    const regExpPattern =
      `(?<${paramName}>${ROUTE_PATHNAME_PARAM_REGEXP_PATTERN})`;
    const startOfMatchIndex = endOfMatchIndex;
    endOfMatchIndex = matches.index + match.length;
    pathnameRegExpPattern +=
      normRoutePathname.slice(startOfMatchIndex, matches.index) + regExpPattern;
  }
  if (endOfMatchIndex < normRoutePathname.length) {
    pathnameRegExpPattern += normRoutePathname.slice(endOfMatchIndex);
  }
  pathnameRegExpPattern += "$";
  return pathnameRegExpPattern;
}

function requestPathnameMatchesRoutePathname(
  reqPathname: string,
  routePathnameRegExpPattern: string,
) {
  const normReqPathname = normalizeRequestPathname(reqPathname);
  return normReqPathname.match(new RegExp(routePathnameRegExpPattern));
}

function formatMiddlewareResponse(
  response: MiddlewareResponse,
  status: HttpReponseStatus,
): Response {
  if (response instanceof Response) return response;
  if (response instanceof JSONResponse) return response.response;

  switch (typeof response) {
    case "string":
    case "number":
    case "boolean":
      return new Response(response.toString(), {
        status,
        headers: {
          "Content-Type": "text/plain",
        },
      });

    case "object":
      return new Response(JSON.stringify(response), {
        status,
        headers: {
          "Content-Type": "application/json",
        },
      });

    default: {
      if (
        typeof response === "undefined" &&
        status === HttpReponseStatus.NO_CONTENT
      ) {
        return new Response(null, { status });
      }
      // @ts-ignore: The request must not be resolved
      return new Promise((_resolve) => {});
    }
  }
}

/**
 * Decorator factory that attach a response status on a middleware function
 *
 * @param status The response status
 * @returns The decorator
 */
export function ResponseStatus(status: HttpReponseStatus) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<RequestNormalMiddleware>,
  ): TypedPropertyDescriptor<RequestNormalMiddleware> {
    descriptor.value && (descriptor.value.status = status);
    return descriptor;
  };
}

// #endregion
