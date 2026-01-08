import type { ServerSocketToSelfEventPayload } from "./socket.server.core.d.ts";

/**
 * Checks if the given payload is a valid server socket to self event payload.
 * @param payload The payload to check.
 * @returns True if the payload is a valid server socket to self event payload, false otherwise.
 */
export function isServerSocketToSelfEventPayload(
  payload: unknown,
): payload is ServerSocketToSelfEventPayload<object> {
  return Array.isArray(payload) && payload.length === 3 &&
    typeof payload[0] === "string" && typeof payload[1] === "object" &&
    typeof payload[2] === "object" &&
    "correlationId" in payload[2];
}
