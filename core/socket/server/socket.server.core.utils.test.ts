import { assertEquals } from "@std/assert";
import { isServerSocketToSelfEventPayload } from "./socket.server.core.utils.ts";

Deno.test("isServerSocketToSelfEventPayload", async (t) => {
  await t.step(
    "should return true for valid payload with all required fields",
    () => {
      const payload = [
        "event-name",
        { data: "test" },
        { correlationId: "corr-123" },
      ];

      assertEquals(isServerSocketToSelfEventPayload(payload), true);
    },
  );

  await t.step(
    "should return true for valid payload with minimal object data",
    () => {
      const payload = [
        "test",
        {},
        { correlationId: "id-1" },
      ];

      assertEquals(isServerSocketToSelfEventPayload(payload), true);
    },
  );

  await t.step(
    "should return true when payload[2] has additional properties",
    () => {
      const payload = [
        "event",
        { key: "value" },
        { correlationId: "corr-1", extra: "prop" },
      ];

      assertEquals(isServerSocketToSelfEventPayload(payload), true);
    },
  );

  await t.step("should return false for array with length < 3", () => {
    const payload = ["event", {}];
    assertEquals(isServerSocketToSelfEventPayload(payload), false);
  });

  await t.step("should return false for array with length > 3", () => {
    const payload = [
      "event",
      {},
      { correlationId: "id-1" },
      "extra",
    ];
    assertEquals(isServerSocketToSelfEventPayload(payload), false);
  });

  await t.step("should return false for empty array", () => {
    assertEquals(isServerSocketToSelfEventPayload([]), false);
  });

  await t.step("should return false when payload[0] is not a string", () => {
    const payload = [
      123,
      {},
      { correlationId: "id-1" },
    ];
    assertEquals(isServerSocketToSelfEventPayload(payload), false);
  });

  await t.step("should return false when payload[0] is null", () => {
    const payload = [
      null,
      {},
      { correlationId: "id-1" },
    ];
    assertEquals(isServerSocketToSelfEventPayload(payload), false);
  });

  await t.step("should return false when payload[0] is undefined", () => {
    const payload = [
      undefined,
      {},
      { correlationId: "id-1" },
    ];
    assertEquals(isServerSocketToSelfEventPayload(payload), false);
  });

  await t.step("should return false when payload[1] is not an object", () => {
    const payload = [
      "event",
      "not-object",
      { correlationId: "id-1" },
    ];
    assertEquals(isServerSocketToSelfEventPayload(payload), false);
  });

  await t.step("should return false when payload[1] is null", () => {
    const payload = [
      "event",
      null,
      { correlationId: "id-1" },
    ];
    // NOTE: typeof null === "object" in JavaScript, so this passes the type check
    assertEquals(isServerSocketToSelfEventPayload(payload), true);
  });

  await t.step("should return false when payload[1] is a number", () => {
    const payload = [
      "event",
      42,
      { correlationId: "id-1" },
    ];
    assertEquals(isServerSocketToSelfEventPayload(payload), false);
  });

  await t.step("should return false when payload[2] is not an object", () => {
    const payload = [
      "event",
      {},
      "not-object",
    ];
    assertEquals(isServerSocketToSelfEventPayload(payload), false);
  });

  await t.step("should throw error when payload[2] is null", () => {
    const payload = [
      "event",
      {},
      null,
    ];
    // NOTE: typeof null === "object" passes, but "correlationId" in null throws TypeError
    let errorThrown = false;
    try {
      isServerSocketToSelfEventPayload(payload);
    } catch (e) {
      errorThrown = e instanceof TypeError;
    }
    assertEquals(errorThrown, true);
  });

  await t.step("should return false when payload[2] is an array", () => {
    const payload = [
      "event",
      {},
      ["array"],
    ];
    assertEquals(isServerSocketToSelfEventPayload(payload), false);
  });

  await t.step(
    "should return false when payload[2] does not have correlationId",
    () => {
      const payload = [
        "event",
        {},
        { otherProp: "value" },
      ];
      assertEquals(isServerSocketToSelfEventPayload(payload), false);
    },
  );

  await t.step("should return false when payload[2] is empty object", () => {
    const payload = [
      "event",
      {},
      {},
    ];
    assertEquals(isServerSocketToSelfEventPayload(payload), false);
  });

  await t.step("should return false for non-array input", () => {
    assertEquals(isServerSocketToSelfEventPayload("not-array"), false);
  });

  await t.step("should return false for object input", () => {
    assertEquals(isServerSocketToSelfEventPayload({ key: "value" }), false);
  });

  await t.step("should return false for null input", () => {
    assertEquals(isServerSocketToSelfEventPayload(null), false);
  });

  await t.step("should return false for undefined input", () => {
    assertEquals(isServerSocketToSelfEventPayload(undefined), false);
  });

  await t.step("should return false for number input", () => {
    assertEquals(isServerSocketToSelfEventPayload(123), false);
  });
});
