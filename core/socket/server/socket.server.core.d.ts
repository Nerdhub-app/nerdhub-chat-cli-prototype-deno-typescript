import type { SocketEndpointType } from "./server-socket.core.const.ts";

/**
 * A type that can be either a value or a promise.
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * The payload of an event emitted by the event target.
 *
 * @example
 * ```ts
 * const payload: ServerSocketEventEventTargetGossiprelayPayload = [
 *   "event-name",
 *   { data: "data" },
 *   [SocketEndpointType.Socket, "socket-id"],
 *   [SocketEndpointType.Room, "room-name", true],
 *   { correlationId: "correlation-id" },
 * ];
 * ```
 */
type ServerSocketEventEventTargetGossipRelayPayload = [
  string,
  object,
  [SocketEndpointType, string],
  [SocketEndpointType, string, boolean],
  [ServerSocketEventHeaders],
];

/**
 * Operations targeted to another single socket.
 */
export interface ServerSocketToSocketOperations {
  /**
   * Emits a message to the topic.
   * @param eventName The event name to emit.
   * @param eventData The event data to send with the topic.
   * @param headers The headers to send with the topic.
   */
  emit<TEventData extends object = object>(
    eventName: string,
    eventData: TEventData,
    headers?: Record<string, string>,
  ): void;
}

/**
 * Operations targetted to a specific room.
 */
export interface ServerSocketRoomOperations {
  /**
   * Emits a message to the topic.
   * @param eventName The event name to emit.
   * @param eventData The event data to send with the topic.
   * @param headers The headers to send with the topic.
   */
  emit<TEventData extends object = object>(
    eventName: string,
    eventData: TEventData,
    headers?: Record<string, string>,
  ): void;

  /**
   * Broadcasts a message to all clients in the room.
   * @param eventName The event name to broadcast.
   * @param eventData The event data to send with the topic.
   * @param headers The headers to send with the topic.
   */
  broadcast<TEventData extends object = object>(
    eventName: string,
    eventData: TEventData,
    headers?: Record<string, string>,
  ): void;

  /**
   * Leaves the room
   */
  leave(): void;
}

/**
 * The payload of a server socket event targeted to the socket itself.
 * @example
 * ```ts
 * const payload: ServerSocketToSelfEventPayload = [
 *   "event-name",
 *   { data: "data" },
 *   { correlationId: "correlation-id" },
 * ];
 * ```
 */
export type ServerSocketToSelfEventPayload<TEventData extends object = object> =
  [
    string,
    TEventData,
    ServerSocketEventHeaders,
  ];

/**
 * Operations targeted to the socket itself.
 */
export interface ServerSocketToSelfOperations {
  /**
   * Emits a message to the topic itself with headers.
   * @param eventName The event name to emit.
   * @param eventData The event data to send with the topic.
   * @param headers The headers to send with the topic.
   */
  emit<TEventData extends object = object>(
    eventName: string,
    eventData: TEventData,
    headers?: Record<string, string>,
  ): void;
}

/**
 * A callback for a client event.
 */
export interface ServerSocketOnClientEventCallback<
  TEventData extends object = object,
> {
  /**
   * @param eventData The event data.
   * @param headers The headers of the event.
   */
  (
    eventData: TEventData,
    headers: ServerSocketEventHeaders,
  ): MaybePromise<void>;
}

/**
 * A server socket.
 * A facade that wraps the native web socket.
 */
export interface ServerSocket {
  /**
   * The underlying native web socket object.
   */
  readonly _socket: WebSocket;

  /**
   * The socket's unique id
   */
  readonly id: string;

  /**
   * Registers a listener for the open event.
   * @param callback The callback to register.
   */
  onOpen(callback: () => MaybePromise<void>): void;

  /**
   * Registers a listener for the close event.
   * @param callback The callback to register.
   */
  onClose(callback: () => MaybePromise<void>): void;

  /**
   * Joins the socket to a room.
   * @param room The room to join.
   */
  join(room: string): void;

  /**
   * Leaves the socket from a room.
   * @param room The room to leave.
   */
  leave(room: string): void;

  /**
   * Leaves all rooms the socket is in.
   */
  leaveAllRooms(): void;

  /**
   * Gets the rooms the socket is in.
   * @returns The rooms the socket is in.
   */
  get rooms(): readonly string[];

  /**
   * Gets the room operations for a specific room.
   * @param room The room to get the operations for.
   * @returns The room operations.
   */
  room(room: string): ServerSocketRoomOperations;

  /**
   * Gets the socket operations for a specific socket.
   * @param socketId The socket to get the operations for.
   * @returns The socket operations.
   */
  toSocket(socketId: string): ServerSocketToSocketOperations;

  /**
   * Gets the socket operations for targeted to the socket itself.
   */
  readonly toSelf: ServerSocketToSelfOperations;

  /**
   * Registers a listener for an event name that comes from the client.
   * @param eventName The event name to listen for.
   * @param listener The listener to register.
   */
  on(
    eventName: string,
    listener: ServerSocketOnClientEventCallback<object>,
  ): void;
}

/**
 * A server IO.
 */
export interface ServerIO {
  /**
   * Gets the room operations for a specific room.
   * @param room The room to get the operations for.
   * @returns The room operations.
   */
  room(room: string): Omit<ServerSocketRoomOperations, "broadcast" | "leave">;

  /**
   * Gets the socket operations for a specific socket.
   * @param socketId The socket to get the operations for.
   * @returns The socket operations.
   */
  toSocket(socketId: string): ServerSocketToSocketOperations;
}

/**
 * A handler for a server socket.
 */
export interface ServerSocketHandler {
  /**
   * Handles a server socket.
   * @param socket The server socket to handle.
   * @param io The server IO.
   * @returns A promise that resolves when the server socket is handled.
   */
  (socket: ServerSocket, io: ServerIO): MaybePromise<void>;
}

/**
 * A WebSocket connection handler.
 * Handles a WebSocket connection request.
 */
export interface WebSocketConnectionHandler {
  /**
   * Handles a WebSocket connection request.
   * @param request The request to handle.
   * @returns The response to send.
   */
  handleRequest(request: Request): Response;

  /**
   * Adds a socket handler.
   * @param handler The handler to add.
   */
  addSocketHandler(handler: ServerSocketHandler): this;

  /**
   * The server IO.
   */
  readonly io: ServerIO;
}

/**
 * The headers of a server socket event.
 */
export type ServerSocketEventHeaders<THeaders = Record<string, string>> = {
  /**
   * The correlation id of the event.
   */
  correlationId: string;
} & THeaders;

/**
 * The sender of a server socket event.
 */
export type ServerSocketEmitSender = {
  type: SocketEndpointType.Socket;
  socketId?: string;
} | {
  type: SocketEndpointType.System;
};

/**
 * The receiver of a server socket event.
 */
export type ServerSocketEmitReceiver = {
  type: SocketEndpointType.Socket;
  socketId: string;
} | {
  type: SocketEndpointType.Room;
  roomName: string;
  excludeSender?: boolean;
};

/**
 * A listener for server socket events.
 * @param eventName The name of the event.
 * @param eventData The data of the event.
 * @param sender The sender of the event.
 * @param receiver The receiver of the event.
 * @param headers The headers of the event.
 */
export type ServerSocketEventGossipRelayListener = (
  eventName: string,
  eventData: object,
  sender: ServerSocketEmitSender,
  receiver: ServerSocketEmitReceiver,
  headers: ServerSocketEventHeaders,
) => MaybePromise<void>;

/**
 * Contract for the gossip relay of server socket events.
 */
export interface ServerSocketEventGossipRelay {
  /**
   * Emits an event to the gossip relay.
   * @param eventName The name of the event.
   * @param eventData The data of the event.
   * @param sender The sender of the event.
   * @param receiver The receiver of the event.
   * @param headers The headers of the event.
   */
  emit(
    eventName: string,
    eventData: object,
    sender: ServerSocketEmitSender,
    receiver: ServerSocketEmitReceiver,
    headers?: ServerSocketEventHeaders,
  ): MaybePromise<void>;

  /**
   * Registers a listener for the emit event.
   * @param listener The listener to register.
   */
  onEmit(listener: ServerSocketEventGossipRelayListener): void;
}

/**
 * The data of an ack event.
 */
export type ServerSockeAckEventData = {
  /**
   * The correlation id of the event.
   */
  correlationId: string;
};
