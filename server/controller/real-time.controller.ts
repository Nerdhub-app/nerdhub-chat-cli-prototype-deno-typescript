import type { RouterRequest, RouterResponse } from "@scope/core/router";
import autobind from "../decorators/autobind.decorator.ts";
import { wsConnectionHandler } from "../ws/ws-connection.handler.ts";

export class RealTimeController {
  @autobind
  handleRealTimeHandshake(
    req: RouterRequest,
    _res: RouterResponse,
  ) {
    const { _request: request } = req;
    return wsConnectionHandler.handleRequest(request);
  }
}

// RealTimeController singleton
let realTimeController: RealTimeController;

/**
 * Injects RealTimeController
 * @returns RealTimeController instance
 */
export const injectRealTimeController = () => {
  if (!realTimeController) {
    realTimeController = new RealTimeController();
  }
  return realTimeController;
};

export default RealTimeController;
