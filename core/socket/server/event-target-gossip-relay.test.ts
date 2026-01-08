import { assertEquals, assertThrows } from "@std/assert";
import { spy } from "@std/testing/mock";
import { EventTargetGossipRelay } from "./event-target-gossip-relay.ts";
import { SocketEndpointType } from "./server-socket.core.const.ts";
import type {
  ServerSocketEmitReceiver,
  ServerSocketEmitSender,
} from "./socket.server.core.d.ts";

Deno.test("EventTargetGossipRelay - emit", async (t) => {
  await t.step(
    "should trigger onEmit listener with correct arguments when emitting to a socket",
    () => {
      const relay = new EventTargetGossipRelay();
      const listener = spy(() => {});
      relay.onEmit(listener);

      const eventName = "test-event";
      const eventData = { foo: "bar" };
      const sender: ServerSocketEmitSender = {
        type: SocketEndpointType.Socket,
        socketId: "sender-id",
      };
      const receiver: ServerSocketEmitReceiver = {
        type: SocketEndpointType.Socket,
        socketId: "receiver-id",
      };
      const headers = { correlationId: "corr-id" };

      relay.emit(eventName, eventData, sender, receiver, headers);

      assertEquals(listener.calls.length, 1);
      assertEquals(listener.calls[0].args, [
        eventName,
        eventData,
        sender,
        receiver,
        headers,
      ]);
    },
  );

  await t.step(
    "should trigger onEmit listener with correct arguments when emitting to a room",
    () => {
      const relay = new EventTargetGossipRelay();
      const listener = spy(() => {});
      relay.onEmit(listener);

      const eventName = "room-event";
      const eventData = { data: 123 };
      const sender: ServerSocketEmitSender = {
        type: SocketEndpointType.Socket,
        socketId: "sender-id",
      };
      const receiver: ServerSocketEmitReceiver = {
        type: SocketEndpointType.Room,
        roomName: "target-room",
        excludeSender: true,
      };
      const headers = { correlationId: "corr-id-2" };

      relay.emit(eventName, eventData, sender, receiver, headers);

      assertEquals(listener.calls.length, 1);
      assertEquals(listener.calls[0].args, [
        eventName,
        eventData,
        sender,
        receiver,
        headers,
      ]);
    },
  );

  await t.step("should throw error for unsupported receiver type", () => {
    const relay = new EventTargetGossipRelay();
    const sender: ServerSocketEmitSender = {
      type: SocketEndpointType.Socket,
      socketId: "sender-id",
    };
    // Cast to force invalid type
    const receiver = {
      type: "invalid-type",
      socketId: "id",
    } as unknown as ServerSocketEmitReceiver;

    assertThrows(
      () => {
        relay.emit("event", {}, sender, receiver);
      },
      Error,
      "Invalid receiver type.",
    );
  });
});
