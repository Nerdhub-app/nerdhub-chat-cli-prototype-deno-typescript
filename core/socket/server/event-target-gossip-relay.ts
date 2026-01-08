import { SocketEndpointType } from "./server-socket.core.const.ts";
import type {
  MaybePromise,
  ServerSocketEmitReceiver,
  ServerSocketEmitSender,
  ServerSocketEventGossipRelay,
  ServerSocketEventGossipRelayListener,
  ServerSocketEventHeaders,
} from "./socket.server.core.d.ts";

/**
 * The payload of an event emitted by the event target.
 *
 * @example
 * ```ts
 * const payload: ServerSocketEventEventTargetGossipRelayPayload = [
 *   "event-name",
 *   { data: "data" },
 *   { type: SocketEndpointType.Socket, socketId: "socket-id" },
 *   { type: SocketEndpointType.Room, roomName: "room-name", excludeSender: true },
 *   { correlationId: "correlation-id" },
 * ];
 * ```
 */
type ServerSocketEventEventTargetGossipRelayPayload = [
  string,
  object,
  ServerSocketEmitSender,
  ServerSocketEmitReceiver,
  ServerSocketEventHeaders,
];

/**
 * The names of the events emitted by the event target.
 */
enum GossipLayerEventName {
  ToSocket = "to-socket",
  ToRoom = "to-room",
}

/**
 * A map of socket endpoint types to gossip layer event names.
 */
const socketEndpointTypeToGossipRelayEventName = new Map([
  [SocketEndpointType.Socket, GossipLayerEventName.ToSocket],
  [SocketEndpointType.Room, GossipLayerEventName.ToRoom],
]);

/**
 * A gossip layer that emits events to the event target.
 */
export class EventTargetGossipRelay implements ServerSocketEventGossipRelay {
  /**
   * The event target.
   */
  #eventTarget!: EventTarget;

  /**
   * The listener to emit events to.
   */
  #emitListener?: ServerSocketEventGossipRelayListener;

  /**
   * @param listener The listener to emit events to.
   */
  constructor() {
    this.#eventTarget = new EventTarget();

    // Register the event listeners.
    this.#eventTarget.addEventListener(
      GossipLayerEventName.ToSocket,
      this.handleGossipLayerEvent,
    );
    this.#eventTarget.addEventListener(
      GossipLayerEventName.ToRoom,
      this.handleGossipLayerEvent,
    );
  }

  onEmit(listener: ServerSocketEventGossipRelayListener): void {
    this.#emitListener = listener;
  }

  /**
   * Handles an event emitted by the event target.
   * @param event The event to handle.
   */
  private handleGossipLayerEvent: Parameters<
    EventTarget["addEventListener"]
  >[1] = (event) => {
    if (event instanceof CustomEvent) {
      const payload = event
        .detail as ServerSocketEventEventTargetGossipRelayPayload;
      this.#emitListener?.(
        payload[0],
        payload[1],
        payload[2],
        payload[3],
        payload[4],
      );
    }
  };

  emit(
    eventName: string,
    eventData: object,
    sender: ServerSocketEmitSender,
    receiver: ServerSocketEmitReceiver,
    headers?: ServerSocketEventHeaders,
  ): MaybePromise<void> {
    const gossipLayerEventName = socketEndpointTypeToGossipRelayEventName.get(
      receiver.type,
    );
    if (!gossipLayerEventName) {
      throw new Error("Invalid receiver type.");
    }
    this.#eventTarget.dispatchEvent(
      new CustomEvent(gossipLayerEventName, {
        detail: [
          eventName,
          eventData,
          sender,
          receiver,
          headers,
        ],
      }),
    );
  }
}

export default EventTargetGossipRelay;
