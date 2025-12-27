import { assert, assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { ConcreteRouterResponse } from "./router-response.ts";
import { HttpReponseStatus } from "../../router.ts";

describe("RouterResponse", () => {
  describe("toDenoResponse", () => {
    it("should create a text response", async () => {
      const response = new ConcreteRouterResponse().text("Hello World");
      const denoResponse = response.toDenoResponse();

      assertEquals(denoResponse.status, 200); // Default status might need to be set or it defaults to 200 by Deno Response if undefined? actually Response defaults to 200 if status is undefined.
      assertEquals(denoResponse.headers.get("Content-Type"), "text/plain");
      assertEquals(await denoResponse.text(), "Hello World");
    });

    it("should create a JSON response", async () => {
      const data = { message: "Hello JSON" };
      const response = new ConcreteRouterResponse().json(data);
      const denoResponse = response.toDenoResponse();

      assertEquals(denoResponse.status, 200);
      assertEquals(
        denoResponse.headers.get("Content-Type"),
        "application/json",
      );
      assertEquals(await denoResponse.json(), data);
    });

    it("should create a response with custom status", () => {
      const response = new ConcreteRouterResponse()
        .setStatus(HttpReponseStatus.NOT_FOUND)
        .text("Not Found");
      const denoResponse = response.toDenoResponse();

      assertEquals(denoResponse.status, 404);
    });

    it("should create a response with custom content type", () => {
      const response = new ConcreteRouterResponse()
        .text("<h1>Hello</h1>")
        .setContentType("text/html");
      const denoResponse = response.toDenoResponse();

      assertEquals(denoResponse.headers.get("Content-Type"), "text/html");
    });

    it("should handle circular JSON serialization error", async () => {
      // deno-lint-ignore no-explicit-any
      const circular: any = {};
      circular.self = circular;

      const response = new ConcreteRouterResponse().json(circular);
      const denoResponse = response.toDenoResponse();

      assertEquals(denoResponse.status, 500);
      assertEquals(
        denoResponse.headers.get("Content-Type"),
        "application/text",
      );
      const text = await denoResponse.text();
      // It should contain "Internal server error"
      assert(text.includes("Internal server error"));
    });

    it("should handle null body", async () => {
      const response = new ConcreteRouterResponse();
      // Not setting body
      const denoResponse = response.toDenoResponse();
      assertEquals(await denoResponse.text(), "");
    });
  });
});
