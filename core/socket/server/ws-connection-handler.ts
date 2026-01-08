import EventTargetGossipRelay from "./event-target-gossip-relay.ts";
import {
  DEFAULT_SERVER_SOCKET_HEARTBEAT_INTERVAL,
  SocketEndpointType,
} from "./server-socket.core.const.ts";
import ConcreteServerSocket from "./server-socket.ts";
import type {
  ServerIO,
  ServerSocket,
  ServerSocketEmitReceiver,
  ServerSocketEmitSender,
  ServerSocketEventGossipRelay,
  ServerSocketEventGossipRelayListener,
  ServerSocketEventHeaders,
  ServerSocketHandler,
  ServerSocketRoomOperations,
  ServerSocketToSocketOperations,
  WebSocketConnectionHandler,
} from "./socket.server.core.d.ts";

/**
 * Config options for {@link createWebSocketConnectionHandler}
 */
export type WebSocketConnectionHandlerOptions = {
  /**
   * The gossip relay
   */
  gossipRelay?: ServerSocketEventGossipRelay;
  /**
   * The interval in milliseconds of the socket's heartbeat check.
   */
  heartbeatInterval?: number;
};

/**
 * Concrete implementation of {@link WebSocketConnectionHandler}
 */
export class ConcreteWebSocketConnectionHandler
  implements WebSocketConnectionHandler {
  /**
   * The gossip layer.
   */
  #gossipRelay!: ServerSocketEventGossipRelay;

  /**
   * Socket heartbeat interval in milliseconds
   */
  #heartbeatInterval!: number;

  /**
   * The server socket handlers.
   */
  #socketHandlers: ServerSocketHandler[] = [];

  /**
   * Map of server socket id to its server socket object.
   * Key: socket id
   * Value: the corresponding server socket object
   */
  #socketIdToServerSocket = new Map<string, ServerSocket>();

  /**
   * Map of room name to its server socket objects.
   * Key: room name
   * Value: map of server socket id to its server socket object
   */
  #roomToServerSocketsMap = new Map<string, Map<string, ServerSocket>>();

  /**
   * The server IO.
   */
  #io!: ServerIO;

  constructor(options?: WebSocketConnectionHandlerOptions) {
    const {
      gossipRelay: gossipLayer = new EventTargetGossipRelay(),
    } = options ?? {};
    this.#gossipRelay = gossipLayer;
    this.#gossipRelay.onEmit(this.handleGossipRelayEmitEvent);
    this.#heartbeatInterval = options?.heartbeatInterval ??
      DEFAULT_SERVER_SOCKET_HEARTBEAT_INTERVAL;

    this.#io = {
      room: (roomName: string) => this.getIoRoomOperations(roomName),
      toSocket: (socketId: string) => this.getIoToSocketOperations(socketId),
    };
  }

  get io(): ServerIO {
    return this.#io;
  }

  addSocketHandler(handler: ServerSocketHandler): this {
    this.#socketHandlers.push(handler);
    return this;
  }

  handleRequest(request: Request): Response {
    if (request.headers.get("upgrade") !== "websocket") {
      return new Response(null, { status: 501 });
    }
    const { response, socket } = Deno.upgradeWebSocket(request);

    // Creating a the server socket object
    const socketId = crypto.randomUUID();
    const serverSocket = new ConcreteServerSocket(socket, socketId, {
      heartbeatInterval: this.#heartbeatInterval,
    });

    // Adding the server socket to the server sockets maps
    this.#socketIdToServerSocket.set(socketId, serverSocket);

    // Setting up the heatbeat
    serverSocket._socket.addEventListener("open", () => {
      serverSocket.startHeartbeat();
    });
    serverSocket._socket.addEventListener("close", () => {
      serverSocket.clearHeartbeat();
    });

    // Overriding the server socket's operations
    // to incorporate state and logic related to the web socket handler.
    serverSocket.join = (roomName: string) =>
      this.socketJoinRoom(serverSocket, roomName);
    serverSocket.leave = (roomName: string) =>
      this.socketLeaveRoom(serverSocket, roomName);
    serverSocket.leaveAllRooms = () => this.socketLeaveAllRooms(serverSocket);
    serverSocket.room = (roomName: string) =>
      this.getSocketRoomOperations(serverSocket, roomName);
    serverSocket.toSocket = (socketId: string) =>
      this.getSocketToSocketOperations(serverSocket, socketId);

    // Calling the registered web socket connection handlers
    for (const handler of this.#socketHandlers) {
      handler(serverSocket, this.io);
    }

    return response;
  }

  /**
   * Makes a server socket join a room.
   * @param socket The server socket
   * @param roomName The name of the room to be joined
   */
  private socketJoinRoom(socket: ServerSocket, roomName: string) {
    // Call the socket's internal join action
    ConcreteServerSocket.prototype.join.call(socket, roomName);
    // Add the socket to the room's sockets map
    let room = this.#roomToServerSocketsMap.get(roomName);
    if (!room) {
      room = new Map<string, ServerSocket>();
    }
    room.set(socket.id, socket);
    this.#roomToServerSocketsMap.set(roomName, room);
  }

  /**
   * Makes a server socket leave a room.
   * @param socket The server socket
   * @param roomName The name of the room to be left
   */
  private socketLeaveRoom(socket: ServerSocket, roomName: string) {
    // Call the socket's internal leave action
    ConcreteServerSocket.prototype.leave.call(socket, roomName);
    const room = this.#roomToServerSocketsMap.get(roomName);
    if (room) {
      // Remove the socket from the room's sockets map
      room.delete(socket.id);
      // Remove the room if it is empty
      if (room.size === 0) {
        this.#roomToServerSocketsMap.delete(roomName);
      }
    }
  }

  /**
   * Make a socket leave all the rooms it belongs to.
   * @param socket The server socket
   */
  private socketLeaveAllRooms(socket: ServerSocket) {
    // Remove the socket from the rooms's sockets maps it belongs to
    for (const roomName of socket.rooms) {
      const room = this.#roomToServerSocketsMap.get(roomName);
      // Remove the socket from the room's sockets map
      if (room) {
        room.delete(socket.id);
        // Remove the room if it is empty
        if (room.size === 0) {
          this.#roomToServerSocketsMap.delete(roomName);
        }
      }
    }
    // Call the socket's internal leave all rooms action
    ConcreteServerSocket.prototype.leaveAllRooms.call(socket);
  }

  /**
   * Getter of the operations targeted to a room by a server socket.
   * @param socket The server socket
   * @param roomName The room name
   * @returns An object containing the operations' methods
   */
  private getSocketRoomOperations(
    socket: ServerSocket,
    roomName: string,
  ): ServerSocketRoomOperations {
    return {
      emit: <TEventData extends object = object>(
        eventName: string,
        eventData: TEventData,
        headers?: Record<string, string>,
      ) => {
        this.#gossipRelay.emit(eventName, eventData, {
          type: SocketEndpointType.Socket,
          socketId: socket.id,
        }, {
          type: SocketEndpointType.Room,
          roomName,
        }, {
          correlationId: crypto.randomUUID(),
          ...(headers ?? {}),
        });
      },
      broadcast: <TEventData extends object = object>(
        eventName: string,
        eventData: TEventData,
        headers?: Record<string, string>,
      ) => {
        this.#gossipRelay.emit(eventName, eventData, {
          type: SocketEndpointType.Socket,
          socketId: socket.id,
        }, {
          type: SocketEndpointType.Room,
          roomName,
          excludeSender: true, // A broadcast excludes the sender
        }, {
          correlationId: crypto.randomUUID(),
          ...(headers ?? {}),
        });
      },
      leave: () => {
        socket.leave(roomName);
      },
    };
  }

  /**
   * Getter of a server socket's operations targeted to another socket.
   * @param socket The server socket
   * @param socketId The target server socket's id
   * @returns An object containing the operations' methods
   */
  private getSocketToSocketOperations(socket: ServerSocket, socketId: string) {
    return {
      emit: <TEventData extends object = object>(
        eventName: string,
        eventData: TEventData,
        headers?: Record<string, string>,
      ) => {
        this.#gossipRelay.emit(eventName, eventData, {
          type: SocketEndpointType.Socket,
          socketId: socket.id,
        }, {
          type: SocketEndpointType.Socket,
          socketId,
        }, {
          correlationId: crypto.randomUUID(),
          ...(headers ?? {}),
        });
      },
    };
  }

  /**
   * Getter of the operations targeted to a room by the system.
   * @param roomName The room name
   * @returns An object containing the operations' methods
   */
  private getIoRoomOperations(
    roomName: string,
  ): Omit<ServerSocketRoomOperations, "broadcast" | "leave"> {
    return {
      emit: <TEventData extends object = object>(
        eventName: string,
        eventData: TEventData,
        headers?: Record<string, string>,
      ) => {
        this.#gossipRelay.emit(eventName, eventData, {
          type: SocketEndpointType.System,
        }, {
          type: SocketEndpointType.Room,
          roomName,
        }, {
          correlationId: crypto.randomUUID(),
          ...(headers ?? {}),
        });
      },
    };
  }

  /**
   * Getter of the operations targeted to another socket by the system.
   * @param socketId The target server socket's id
   * @returns An object containing the operations' methods
   */
  private getIoToSocketOperations(
    socketId: string,
  ): ServerSocketToSocketOperations {
    return {
      emit: <TEventData extends object = object>(
        eventName: string,
        eventData: TEventData,
        headers?: Record<string, string>,
      ) => {
        this.#gossipRelay.emit(eventName, eventData, {
          type: SocketEndpointType.System,
        }, {
          type: SocketEndpointType.Socket,
          socketId,
        }, {
          correlationId: crypto.randomUUID(),
          ...(headers ?? {}),
        });
      },
    };
  }

  /**
   * Handles an emit event from the gossip relay and forwards the event to the destination server socket.
   * @param eventName The event's name
   * @param eventData The event's data
   * @param sender The sender's data
   * @param receiver The receiver's data
   * @param headers The headers of the event
   */
  private handleGossipRelayEmitEvent: ServerSocketEventGossipRelayListener = (
    eventName: string,
    eventData: object,
    sender: ServerSocketEmitSender,
    receiver: ServerSocketEmitReceiver,
    headers: ServerSocketEventHeaders,
  ) => {
    if (receiver.type === SocketEndpointType.Socket) {
      // Forwarding the event to the corresponding target server socket.
      this.#socketIdToServerSocket.get(receiver.socketId)?.toSelf.emit(
        eventName,
        eventData,
        headers,
      );
    } else if (receiver.type === SocketEndpointType.Room) {
      // Forwarding the event to the sockets in the target room.
      const room = this.#roomToServerSocketsMap.get(receiver.roomName);
      if (room) {
        for (const socket of room.values()) {
          // Do not forward the event to the socket if it is the same as the sender.
          if (
            receiver.excludeSender &&
            sender.type === SocketEndpointType.Socket &&
            socket.id === sender.socketId
          ) continue;
          // Forward the event to the socket.
          socket.toSelf.emit(eventName, eventData, headers);
        }
      }
    }
  };
}

/**
 * Web socket connection handler factory.
 * @param options The configuration options
 * @returns A new web socket handler.
 */
export function createWebSocketConnectionHandler(
  options?: WebSocketConnectionHandlerOptions,
): WebSocketConnectionHandler {
  return new ConcreteWebSocketConnectionHandler(options);
}

export default ConcreteWebSocketConnectionHandler;
