import type {
  MaybePromise,
  ServerSocket,
  ServerSocketOnClientEventCallback,
  ServerSocketRoomOperations,
  ServerSocketToSelfEventPayload,
  ServerSocketToSelfOperations,
  ServerSocketToSocketOperations,
} from "./socket.server.core.d.ts";
import { isServerSocketToSelfEventPayload } from "./socket.server.core.utils.ts";

/**
 * Options for the {@link ConcreteServerSocket} constructor.
 */
export type ConcreteServerSocketOptions = {
  /**
   * The interval at which to send heartbeat messages to the client.
   */
  heartbeatInterval: number;
};

/**
 * A concrete implementation of {@link ServerSocket}.
 */
export class ConcreteServerSocket implements ServerSocket {
  /**
   * List of room names the socket is in.
   */
  #rooms: string[] = [];

  /**
   * Map of event names to arrays of {@link ServerSocketOnClientEventCallback} functions.
   */
  #clientEventListeners: Map<
    string,
    ServerSocketOnClientEventCallback<object>[]
  > = new Map();

  /**
   * List of {@link ServerSocketOnOpenCallback} functions to be called when the socket is opened.
   */
  #openListeners: (() => MaybePromise<void>)[] = [];

  /**
   * List of {@link ServerSocketOnCloseCallback} functions to be called when the socket is closed.
   */
  #closeListeners: (() => MaybePromise<void>)[] = [];

  /**
   * The interval at which to send heartbeat messages to the client.
   */
  #heartbeatInterval!: number;

  /**
   * The heartbeat timer used to keep the socket open.
   */
  #heartbeatTimer?: number;

  /**
   * The Deno WebSocket instance.
   */
  readonly _socket!: WebSocket;
  /**
   * The unique ID of the socket.
   */
  readonly id!: string;

  constructor(
    denoWebSocket: WebSocket,
    id: string,
    options: ConcreteServerSocketOptions,
  ) {
    // Sets the Deno WebSocket instance.
    this._socket = denoWebSocket;
    // Generates a unique ID for the socket.
    this.id = id;
    // Sets the heartbeat interval.
    this.#heartbeatInterval = options.heartbeatInterval;

    // Handles the socket opening.
    this._socket.addEventListener("open", () => {
      // Calls the open listeners.
      for (const listener of this.#openListeners) {
        const res = listener();
        try {
          if (res instanceof Promise) {
            res.catch((error) => {
              console.error(error);
            });
          }
        } catch (error) {
          console.error(error);
        }
      }
    });

    // Handles the socket closing.
    this._socket.addEventListener("close", () => {
      // Cleanup.
      this.#rooms = [];
      this.#clientEventListeners.clear();
      this.#openListeners = [];
      this.#closeListeners = [];

      // Calls the close listeners.
      for (const listener of this.#closeListeners) {
        const res = listener();
        try {
          if (res instanceof Promise) {
            res.catch((error) => {
              console.error(error);
            });
          }
        } catch (error) {
          console.error(error);
        }
      }
    });

    // Handles incoming messages from the client.
    this._socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data.toString());
      if (isServerSocketToSelfEventPayload(payload)) {
        const [eventName, eventData, headers] = payload;
        // Gets the listeners for the event.
        const listeners = this.#clientEventListeners.get(eventName);
        // Calls the listeners.
        for (const listener of listeners ?? []) {
          try {
            const res = listener(eventData, headers);
            if (res instanceof Promise) {
              res.catch((error) => {
                console.error(error);
              });
            }
          } catch (error) {
            console.error(error);
          }
        }
      }
    });
  }

  onOpen(callback: () => MaybePromise<void>): void {
    this.#openListeners.push(callback);
  }

  onClose(callback: () => MaybePromise<void>): void {
    this.#closeListeners.push(callback);
  }

  /**
   * Starts the heartbeat timer.
   */
  startHeartbeat() {
    if (this.#heartbeatTimer) this.clearHeartbeat();
    this.#heartbeatTimer = setInterval(() => {
      if (this._socket.readyState !== WebSocket.OPEN) {
        this._socket.close();
        return;
      }
      try {
        this._socket.send(JSON.stringify({ type: "ping" }));
      } catch (_) {
        this._socket.close();
      }
    }, this.#heartbeatInterval);
  }

  clearHeartbeat() {
    if (this.#heartbeatTimer) {
      clearInterval(this.#heartbeatTimer);
    }
  }

  /**
   * Gets the rooms the socket is in.
   */
  get rooms() {
    return Object.freeze([...this.#rooms]);
  }

  join(roomName: string) {
    this.#rooms.push(roomName);
  }

  leave(roomName: string) {
    this.#rooms = this.#rooms.filter((room) => room !== roomName);
  }

  leaveAllRooms() {
    this.#rooms = [];
  }

  room(_: string): ServerSocketRoomOperations {
    throw new Error("Server socket room operations getter not implemented");
  }

  toSocket(_: string): ServerSocketToSocketOperations {
    throw new Error(
      "Server socket to socket operations getter not implemented",
    );
  }

  readonly toSelf: ServerSocketToSelfOperations = {
    emit: <TEventData extends object = object>(
      eventName: string,
      eventData: TEventData,
      headers?: Record<string, string>,
    ) => {
      const payload: ServerSocketToSelfEventPayload<TEventData> = [
        eventName,
        eventData,
        {
          correlationId: headers?.correlationId ?? crypto.randomUUID(),
          ...(headers ?? {}),
        },
      ];
      this._socket.send(JSON.stringify(payload));
    },
  };

  on(
    eventName: string,
    listener: ServerSocketOnClientEventCallback<object>,
  ): void {
    const eventListeners = this.#clientEventListeners.get(eventName);
    if (!eventListeners) {
      this.#clientEventListeners.set(eventName, [listener]);
    } else {
      eventListeners.push(listener);
    }
  }
}

export default ConcreteServerSocket;
