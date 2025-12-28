import type { HttpResponseStatus } from "./router.core.const.ts";

/**
 * Supported HTTP methods for the router.
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Represents an incoming HTTP request within the router, providing access to method, path, params, query, context, and body.
 *
 * @template TParams - Type of the route parameters.
 * @template TQuery - Type of the query parameters.
 * @template TContext - Type of the shared context object.
 * @template TBody - Type of the request body.
 */
export interface RouterRequest<
  TParams extends Record<string, unknown> = Record<string, unknown>,
  TQuery extends Record<string, string> = Record<string, string>,
  TContext = Record<string, unknown>,
  TBody = unknown,
> {
  /**
   * The original Deno Request object.
   */
  get _request(): Request;
  /**
   * The HTTP method of the request.
   */
  get method(): HttpMethod;
  /**
   * The route path definition (e.g., /users/:id).
   */
  get routePathname(): string | undefined;
  /**
   * The actual URL pathname of the request.
   */
  get reqPathname(): string;
  /**
   * Route parameters extracted from the URL.
   */
  get params(): TParams;
  /**
   * Query parameters from the URL search string.
   */
  get query(): TQuery;
  /**
   * Shared context object for passing data between handlers.
   */
  get context(): TContext;
  /**
   * Parsed request body.
   */
  get body(): TBody;
}

/**
 * A generic RouterRequest with default type arguments.
 */
export type GenericRouterRequest = RouterRequest<
  Record<string, unknown>,
  Record<string, string>,
  unknown,
  unknown
>;

/**
 * Interface for constructing and sending the HTTP response.
 *
 * @template TBody - Type of the response body.
 */
export interface RouterResponse<TBody = unknown> {
  /**
   * Sets the HTTP status code for the response.
   * @param status - The HTTP status code.
   */
  setStatus(status: HttpResponseStatus): RouterResponse<TBody>;

  /**
   * Sets the Content-Type header for the response.
   * @param contentType - The MIME type string.
   */
  setContentType(contentType: string): RouterResponse<TBody>;

  /**
   * Sets the JSON response body.
   * @param body - The JSON body to send.
   */
  json(body: TBody): RouterResponse<TBody>;

  /**
   * Sets the text response body.
   * @param text - The text content to send.
   */
  text(text: TBody): RouterResponse<TBody>;

  /**
   * Converts the RouterResponse into a standard Deno Response object.
   * @returns A standard Response object.
   */
  toDenoResponse(): Response;
}

/**
 * Function to call the next handler in the chain.
 */
export type RequestHandlerNextFunction = (error?: unknown) => void;

/**
 * Possible return types for a request handler.
 */
export type RequestHandlerReturnType<TBody = unknown> =
  | void
  | TBody
  | RouterResponse<TBody>
  | Response;

/**
 * Handler function that processes a request and generates a response.
 *
 * @template TParams - Type of the route parameters.
 * @template TQuery - Type of the query parameters.
 * @template TContext - Type of the shared context object.
 * @template TRequestBody - Type of the request body.
 * @template TResponseBody - Type of the response body.
 */
export interface RequestProcessingHandler<
  TParams extends Record<string, unknown>,
  TQuery extends Record<string, string>,
  TContext = Record<string, unknown>,
  TRequestBody = unknown,
  TResponseBody = unknown,
> {
  (
    request: RouterRequest<TParams, TQuery, TContext, TRequestBody>,
    response: RouterResponse<TResponseBody>,
    next?: RequestHandlerNextFunction,
  ): RequestHandlerReturnType<TResponseBody>;

  /**
   * Custom HTTP response status code.
   * Set by a decorator and only used when the handler returns a non-request value.
   */
  httpResponseStatus?: HttpResponseStatus;
}

/**
 * A generic RequestProcessingHandler with default type arguments.
 */
export type GenericRequestProcessingHandler = RequestProcessingHandler<
  Record<string, unknown>,
  Record<string, string>,
  unknown,
  unknown,
  unknown
>;

/**
 * Handler function for catching and processing errors during request handling.
 *
 * @template TParams - Type of the route parameters.
 * @template TQuery - Type of the query parameters.
 * @template TContext - Type of the shared context object.
 * @template TRequestBody - Type of the request body.
 * @template TResponseBody - Type of the response body.
 */
export interface RequestErrorHandler<
  TParams extends Record<string, unknown>,
  TQuery extends Record<string, string>,
  TContext = Record<string, unknown>,
  TRequestBody = unknown,
  TResponseBody = unknown,
> {
  (
    error: unknown,
    request: RouterRequest<TParams, TQuery, TContext, TRequestBody>,
    response: RouterResponse<TResponseBody>,
    next: RequestHandlerNextFunction,
  ): RequestHandlerReturnType<TResponseBody>;

  /**
   * Custom HTTP response status code.
   * Set by a decorator and only used when the handler returns a non-request value.
   */
  httpResponseStatus?: HttpResponseStatus;
}

/**
 * A generic RequestErrorHandler with default type arguments.
 */
export type GenericRequestErrorHandler = RequestErrorHandler<
  Record<string, unknown>,
  Record<string, string>,
  unknown,
  unknown,
  unknown
>;

/**
 * Union type representing either a processing handler or an error handler.
 */
export type RequestHandler<
  TParams extends Record<string, unknown>,
  TQuery extends Record<string, string>,
  TContext = Record<string, unknown>,
  TRequestBody = unknown,
  TResponseBody = unknown,
> =
  | RequestProcessingHandler<
    TParams,
    TQuery,
    TContext,
    TRequestBody,
    TResponseBody
  >
  | RequestErrorHandler<TParams, TQuery, TContext, TRequestBody, TResponseBody>;

/**
 * Array of request processing handlers.
 */
export type RequestProcessingHandlersEntryParams = [
  GenericRequestProcessingHandler,
  ...GenericRequestProcessingHandler[],
];

/**
 * Array of request processing handlers followed by a Router instance (for sub-routing).
 */
export type RequestProcessingHandlersAndRouterEntryParams = [
  ...GenericRequestProcessingHandler[],
  Router,
];

/**
 * Interface defining the router's capabilities for registering middleware and route handlers.
 */
export interface Router {
  /**
   * Registers a global error handler.
   * @param requestErrorHandler - The error handler function.
   */
  use(requestErrorHandler: GenericRequestErrorHandler): void;
  /**
   * Registers global middleware handlers.
   * @param requestProcessingHandlers - The middleware handlers.
   */
  use(
    ...requestProcessingHandlers: RequestProcessingHandlersEntryParams
  ): void;
  /**
   * Registers middleware for a specific path.
   * @param pathname - The route path.
   * @param requestProcessingHandlers - The middleware handlers.
   */
  use(
    pathname: string,
    ...requestProcessingHandlers: RequestProcessingHandlersEntryParams
  ): void;
  /**
   * Registers a sub-router for a specific path.
   * @param pathname - The route path.
   * @param requestProcessingHandlers - Optional middleware handlers followed by the sub-router.
   */
  use(
    pathname: string,
    ...requestProcessingHandlers: RequestProcessingHandlersAndRouterEntryParams
  ): void;

  /**
   * Registers a GET route handler.
   * @param requestProcessingHandlers - The request handlers.
   */
  get(
    ...requestProcessingHandlers: RequestProcessingHandlersEntryParams
  ): void;
  /**
   * Registers a GET route handler for a specific path.
   * @param pathname - The route path.
   * @param requestProcessingHandlers - The request handlers.
   */
  get(
    pathname: string,
    ...requestProcessingHandlers: RequestProcessingHandlersEntryParams
  ): void;

  /**
   * Registers a POST route handler.
   * @param requestProcessingHandlers - The request handlers.
   */
  post(
    ...requestProcessingHandlers: RequestProcessingHandlersEntryParams
  ): void;
  /**
   * Registers a POST route handler for a specific path.
   * @param pathname - The route path.
   * @param requestProcessingHandlers - The request handlers.
   */
  post(
    pathname: string,
    ...requestProcessingHandlers: RequestProcessingHandlersEntryParams
  ): void;

  /**
   * Registers a PUT route handler.
   * @param requestProcessingHandlers - The request handlers.
   */
  put(
    ...requestProcessingHandlers: RequestProcessingHandlersEntryParams
  ): void;
  /**
   * Registers a PUT route handler for a specific path.
   * @param pathname - The route path.
   * @param requestProcessingHandlers - The request handlers.
   */
  put(
    pathname: string,
    ...requestProcessingHandlers: RequestProcessingHandlersEntryParams
  ): void;

  /**
   * Registers a PATCH route handler.
   * @param requestProcessingHandlers - The request handlers.
   */
  patch(
    ...requestProcessingHandlers: RequestProcessingHandlersEntryParams
  ): void;
  /**
   * Registers a PATCH route handler for a specific path.
   * @param pathname - The route path.
   * @param requestProcessingHandlers - The request handlers.
   */
  patch(
    pathname: string,
    ...requestProcessingHandlers: RequestProcessingHandlersEntryParams
  ): void;

  /**
   * Registers a DELETE route handler.
   * @param requestProcessingHandlers - The request handlers.
   */
  delete(
    ...requestProcessingHandlers: RequestProcessingHandlersEntryParams
  ): void;
  /**
   * Registers a DELETE route handler for a specific path.
   * @param pathname - The route path.
   * @param requestProcessingHandlers - The request handlers.
   */
  delete(
    pathname: string,
    ...requestProcessingHandlers: RequestProcessingHandlersEntryParams
  ): void;
}

/**
 * Extended Router interface for the main application router, capable of handling raw Deno requests.
 */
export interface AppRouter extends Router {
  /**
   * Entry point for handling a raw Deno Request.
   * @param request - The raw Deno Request object.
   * @returns A promise resolving to a Response object.
   */
  handleDenoRequest(request: Request): Promise<Response>;
}
