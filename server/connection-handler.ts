export default class ConnectionHandler {
  constructor(private socket: WebSocket) {
    socket.addEventListener("open", this.handleOpen);
    socket.addEventListener("message", this.handleMessage);
  }

  handleOpen = () => {
    console.log("a client connected!");
  };

  handleMessage = (event: MessageEvent<unknown>) => {
    if (event.data === "ping") {
      this.socket.send("pong");
    }
  };
}
