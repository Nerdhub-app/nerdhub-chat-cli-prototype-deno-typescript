import { createWebSocketConnectionHandler } from "@scope/core/socket/server";

export const wsConnectionHandler = createWebSocketConnectionHandler();

wsConnectionHandler.addSocketHandler(() => {
  console.log("A socket joined the room");
});

export default wsConnectionHandler;
