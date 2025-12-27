import type { HttpMethod, RouterRequest } from "./router.core.d.ts";

export type RouterRequestInitArgs<TQuery, TContext, TBody> = {
  query: TQuery;
  context: TContext;
  body: TBody;
  _request: Request;
};

export class ConcreteRouterRequest<
  TParams extends Record<string, unknown> = Record<string, unknown>,
  TQuery extends Record<string, string> = Record<string, string>,
  TContext = Record<string, unknown>,
  TBody = unknown,
> implements RouterRequest<TParams, TQuery, TContext, TBody> {
  #request!: Request;
  get _request(): Request {
    return this.#request;
  }

  get method(): HttpMethod {
    return this._request.method as HttpMethod;
  }

  #routePathname?: string;
  get routePathname(): string | undefined {
    return this.#routePathname;
  }
  set routePathname(value: string) {
    this.#routePathname = value;
  }

  #reqPathname!: string;
  get reqPathname(): string {
    if (this.#reqPathname) return this.#reqPathname;
    return new URL(this._request.url).pathname;
  }

  #params!: TParams;
  get params(): TParams {
    return this.#params;
  }
  set params(value: TParams) {
    this.#params = value;
  }

  #query!: TQuery;
  get query(): TQuery {
    return this.#query;
  }

  #context!: TContext;
  get context(): TContext {
    return this.#context;
  }

  #body!: TBody;
  get body(): TBody {
    return this.#body;
  }

  constructor(
    initArgs: RouterRequestInitArgs<TQuery, TContext, TBody>,
  ) {
    this.#body = initArgs.body;
    this.#query = initArgs.query;
    this.#context = initArgs.context;
    this.#body = initArgs.body;
    this.#request = initArgs._request;
  }
}

export default ConcreteRouterRequest;
