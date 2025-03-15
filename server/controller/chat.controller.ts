import ConnectionHandler from "../connection-handler.ts";

export default class ChatController {
  static handleChatHandshake(req: Request) {
    if (req.headers.get("upgrade") != "websocket") {
      return new Response(null, { status: 501 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    new ConnectionHandler(socket);

    return response;
  }
}
