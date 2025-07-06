import ConnectionHandler from "../connection-handler.ts";
import { HttpReponseStatus, type RequestNormalMiddleware } from "../router.ts";

export default class RealTimeController {
  static handleRealTimeHandshake: RequestNormalMiddleware = (req, _next) => {
    const { request } = req;

    if (request.headers.get("upgrade") != "websocket") {
      return new Response(null, { status: HttpReponseStatus.NOT_IMPLEMENTED });
    }

    const { socket, response } = Deno.upgradeWebSocket(request);
    new ConnectionHandler(socket);

    return response;
  };
}
