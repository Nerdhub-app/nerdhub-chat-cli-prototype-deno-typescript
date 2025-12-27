import type { HttpReponseStatus } from "../../router.ts";
import type { RouterResponse } from "./router.core.d.ts";

export class ConcreteRouterResponse<TBody = unknown>
  implements RouterResponse<TBody> {
  #status?: HttpReponseStatus;
  #contentType?: string;
  #body: TBody | null = null;

  setStatus(status: HttpReponseStatus): RouterResponse<TBody> {
    this.#status = status;
    return this;
  }

  setContentType(contentType: string): RouterResponse<TBody> {
    this.#contentType = contentType;
    return this;
  }

  json(json: TBody): RouterResponse<TBody> {
    this.#contentType = "application/json";
    this.#body = json;
    return this;
  }

  text(text: TBody): RouterResponse<TBody> {
    this.#contentType = "text/plain";
    this.#body = text;
    return this;
  }

  toDenoResponse(): Response {
    let body: BodyInit;
    if (this.#body === null) {
      body = "";
    } else if (typeof this.#body === "string") {
      body = this.#body;
    } else if (typeof this.#body === "object") {
      try {
        body = JSON.stringify(this.#body);
      } catch (error) {
        let errorBody = "Internal server error";
        if (error instanceof Error) {
          errorBody += ":\n" + error.message;
        }
        return new Response(errorBody, {
          status: 500,
          headers: {
            "Content-Type": "application/text",
          },
        });
      }
    } else {
      body = this.#body?.toString() ?? "";
    }
    return new Response(body, {
      status: this.#status,
      headers: {
        "Content-Type": this.#contentType ?? "text/plain",
      },
    });
  }
}
