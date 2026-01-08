/**
 * The type of a socket endpoint.
 * A socket endpoint is either an individual socket or a room.
 */
export enum SocketEndpointType {
  /**
   * The socket endpoint is an individual socket.
   */
  Socket = "socket",
  /**
   * The socket endpoint is a room.
   */
  Room = "room",
  /**
   * The socket endpoint is the system.
   */
  System = "system",
}

/**
 * The default heartbeat interval for a server socket.
 */
export const DEFAULT_SERVER_SOCKET_HEARTBEAT_INTERVAL = 30_000;
