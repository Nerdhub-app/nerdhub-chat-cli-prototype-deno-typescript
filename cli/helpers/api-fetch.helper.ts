import { cliContext } from "../context.ts";

export type WrappedFetchResponse<TBody extends object> = {
  response: Response;
  status: number;
  ok: boolean;
  bodyJSON: TBody;
};

export class WrappedFetchResponseError<TResponseBody extends object>
  extends Error
  implements WrappedFetchResponse<TResponseBody> {
  response!: Response;
  status!: number;
  ok!: boolean;
  bodyJSON!: TResponseBody;

  constructor(res: WrappedFetchResponse<TResponseBody>) {
    const message = `Failed to make a http request to ${res.response.url}`;
    super(message);
    this.response = res.response;
    this.status = res.status;
    this.ok = res.ok;
    this.bodyJSON = res.bodyJSON;
  }
}

export async function wrapFetchResponse<TBody extends object>(
  response: Response,
): Promise<WrappedFetchResponse<TBody>> {
  const bodyJSON = await response.json();
  const wrappedResponse: WrappedFetchResponse<TBody> = {
    response,
    status: response.status,
    ok: response.ok,
    bodyJSON: bodyJSON,
  };
  if (!response.ok) {
    throw new WrappedFetchResponseError<TBody>(wrappedResponse);
  }
  return wrappedResponse;
}

type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

type FetchOptions<TReqBody extends object = object> = {
  body?: TReqBody;
  headers?: Record<string, string>;
  deviceHash?: string;
  bearerToken?: string;
};

export const DEVICE_HASH_HEADERS_KEY = "X-Device-Hash";

export default class ApiFetch {
  private static async req<
    TReqBody extends object = object,
    TResBody extends object = object,
  >(
    method: HTTPMethod,
    endpoint: string,
    options?: FetchOptions<TReqBody>,
  ) {
    const headers: Record<string, string> = options?.headers ?? {};
    if (options?.body) {
      headers["Content-Type"] = "application/json";
    }
    if (options?.deviceHash) {
      headers[DEVICE_HASH_HEADERS_KEY] = options.deviceHash;
    }
    if (options?.bearerToken) {
      headers["Authorization"] = `Bearer ${options.bearerToken}`;
    }
    const url = cliContext.apiURL + endpoint;
    const response = await fetch(url, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });
    return wrapFetchResponse<TResBody>(response);
  }

  static get<TResBody extends object>(
    endpoint: string,
    options?: FetchOptions,
  ) {
    return ApiFetch.req<object, TResBody>("GET", endpoint, options);
  }

  static post<TReqBody extends object, TResBody extends object>(
    endpoint: string,
    body: TReqBody,
    options?: FetchOptions<TReqBody>,
  ) {
    return ApiFetch.req<object, TResBody>("POST", endpoint, {
      ...options,
      body,
    });
  }

  static put<TReqBody extends object, TResBody extends object>(
    endpoint: string,
    body: TReqBody,
    options?: FetchOptions<TReqBody>,
  ) {
    return ApiFetch.req<object, TResBody>("PUT", endpoint, {
      ...options,
      body,
    });
  }

  static patch<TReqBody extends object, TResBody extends object>(
    endpoint: string,
    body: TReqBody,
    options?: FetchOptions<TReqBody>,
  ) {
    return ApiFetch.req<object, TResBody>("PATCH", endpoint, {
      ...options,
      body,
    });
  }

  static delete<
    TResBody extends object = object,
    TReqBody extends object = object,
  >(
    endpoint: string,
    options?: FetchOptions<TReqBody>,
  ) {
    return ApiFetch.req<object, TResBody>("DELETE", endpoint, options);
  }
}
