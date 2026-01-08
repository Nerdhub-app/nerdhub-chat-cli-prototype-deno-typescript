import { spy, stub } from "@std/testing/mock";
import EventTargetGossipRelay from "./event-target-gossip-relay.ts";
import ConcreteWebSocketConnectionHandler from "./ws-connection-handler.ts";
import type { ServerIO, ServerSocket } from "./socket.server.core.d.ts";
import { assert } from "@std/assert/assert";
import { assertExists } from "@std/assert";

Deno.test("Socket handler properly called", async () => {
  // Arrange
  const gossipRelay = new EventTargetGossipRelay();
  const wsConnHandler = new ConcreteWebSocketConnectionHandler({
    gossipRelay,
  });
  const socketHandlerSpy = spy((_socket: ServerSocket, _io: ServerIO) => {});
  const ac = new AbortController();

  let server: Deno.HttpServer | undefined;
  try {
    // Act
    const socket = await new Promise<ServerSocket>((resolve) => {
      server = Deno.serve({
        port: 8000,
        handler: (req: Request) => {
          wsConnHandler.addSocketHandler((_socket, _io) => {
            socketHandlerSpy(_socket, _io);
            resolve(_socket);
          });
          return wsConnHandler.handleRequest(req);
        },
        signal: ac.signal,
      });
      new WebSocket("ws://localhost:8000");
    });

    // Assert
    assert(socketHandlerSpy.calls.length > 0);
    assertExists(socket.id);
    assertExists(socketHandlerSpy.calls[0].args[1]); // Assert io exists
  } catch (error) {
    throw error;
  } finally {
    // Cleanup
    ac.abort();
    if (server) await server.finished;
    // socketHandlerSpy.restore(); // not needed for standalone spy
  }
});

Deno.test("Heartbeat started successfully", async () => {
  // Arrange
  const heartbeatInterval = 5;
  const gossipRelay = new EventTargetGossipRelay();
  const setIntervalSpy = spy(globalThis, "setInterval");
  // deno-lint-ignore no-explicit-any
  let socketSendStub: any;

  const wsConnHandler = new ConcreteWebSocketConnectionHandler({
    gossipRelay,
    heartbeatInterval,
  });

  const ac = new AbortController();

  let server: Deno.HttpServer;

  try {
    // Act
    await new Promise<void>((resolve, reject) => {
      server = Deno.serve({
        port: 8001,
        handler: (req: Request) => {
          wsConnHandler.addSocketHandler((serverSocket) => {
            // Mock the send method of the native ws of the socket object
            socketSendStub = stub(
              serverSocket._socket,
              "send",
              () => {},
            );
          });
          return wsConnHandler.handleRequest(req);
        },
        signal: ac.signal,
        onListen: () => {
          const ws = new WebSocket("ws://localhost:8001");
          ws.onopen = () => {
            // Wait for the heartbeat interval to trigger
            setTimeout(() => {
              ws.close();
              resolve();
            }, heartbeatInterval + 10);
          };
          ws.onerror = (e) => reject(e);
        },
      });
    });

    // Assert
    // Assert that the setInterval function was called
    assert(setIntervalSpy.calls.length > 0, "setInterval should be called");
    const intervalCall = setIntervalSpy.calls.find((call) =>
      call.args[1] === heartbeatInterval
    );
    assertExists(
      intervalCall,
      `setInterval should be called with interval ${heartbeatInterval}`,
    );

    // Assert that the send function sent a ping
    assertExists(socketSendStub, "socket.send should have been stubbed");
    assert(socketSendStub.calls.length > 0, "socket.send should be called");
    // deno-lint-ignore no-explicit-any
    const pingCall = socketSendStub.calls.find((call: any) => {
      const arg = call.args[0] as string;
      return arg.includes('"type":"ping"');
    });
    assertExists(pingCall, "socket.send should send a ping message");
  } catch (error) {
    throw error;
  } finally {
    // Cleanup
    ac.abort();
    await server!.finished;
    setIntervalSpy.restore();
    if (socketSendStub && !socketSendStub.restored) {
      socketSendStub.restore();
    }
  }
});

Deno.test("Heartbeat stopped successfully after socket closed", async () => {
  // Arrange
  const heartbeatInterval = 5;
  const gossipRelay = new EventTargetGossipRelay();
  const clearIntervalSpy = spy(globalThis, "clearInterval");
  const setIntervalSpy = spy(globalThis, "setInterval");

  const wsConnHandler = new ConcreteWebSocketConnectionHandler({
    gossipRelay,
    heartbeatInterval,
  });

  const ac = new AbortController();
  let server: Deno.HttpServer | undefined;

  try {
    // Act
    await new Promise<void>((resolve, reject) => {
      server = Deno.serve({
        port: 8002,
        handler: (req: Request) => {
          wsConnHandler.addSocketHandler((_socket) => {});
          return wsConnHandler.handleRequest(req);
        },
        signal: ac.signal,
        onListen: () => {
          const ws = new WebSocket("ws://localhost:8002");
          ws.onopen = () => {
            // Wait a bit to ensure heartbeat starts
            setTimeout(() => {
              ws.close();
            }, 200);
          };
          ws.onclose = () => {
            resolve();
          };
          ws.onerror = (e) => reject(e);
        },
      });
    });

    // Assert
    // First verify that heartbeat actually started
    assert(
      setIntervalSpy.calls.length > 0,
      "setInterval should be called (heartbeat started)",
    );

    // Assert that the clearInterval function was called
    assert(
      clearIntervalSpy.calls.length > 0,
      "clearInterval should be called (heartbeat stopped)",
    );
  } catch (error) {
    throw error;
  } finally {
    // Cleanup
    ac.abort();
    if (server) await server.finished;
    try {
      clearIntervalSpy.restore();
    } catch (_) { /* ignore */ }
    try {
      setIntervalSpy.restore();
    } catch (_) { /* ignore */ }
  }
});

Deno.test("Clients in room receive emitted events", async () => {
  // Arrange
  const gossipRelay = new EventTargetGossipRelay();
  const wsConnHandler = new ConcreteWebSocketConnectionHandler({
    gossipRelay,
  });

  const ac = new AbortController();
  let server: Deno.HttpServer | undefined;
  // deno-lint-ignore no-explicit-any
  let senderSocket: any; // ServerSocket (using any to avoid type issues with private/internal types if needed, but ServerSocket is exported)

  // Helper to wait for a message on a WebSocket
  const waitForMessage = (ws: WebSocket) => {
    return new Promise<string>((resolve) => {
      const listener = (event: MessageEvent) => {
        if (
          typeof event.data === "string" && event.data.includes('"type":"ping"')
        ) return;
        ws.removeEventListener("message", listener);
        resolve(event.data);
      };
      ws.addEventListener("message", listener);
    });
  };

  try {
    // Act
    // Setup the handler once before starting the server
    wsConnHandler.addSocketHandler((serverSocket) => {
      // 2. Join both to a room
      serverSocket.join("test-room");
      if (!senderSocket) {
        senderSocket = serverSocket;
      }
    });

    await new Promise<void>((resolve, reject) => {
      server = Deno.serve({
        port: 8000,
        handler: (req: Request) => {
          return wsConnHandler.handleRequest(req);
        },
        signal: ac.signal,
        onListen: async () => {
          try {
            // 1. Create 2 WebSocket clients
            const client1 = new WebSocket("ws://localhost:8000");
            const client2 = new WebSocket("ws://localhost:8000");

            await new Promise<void>((r) => {
              let connected = 0;
              const onOpen = () => {
                connected++;
                if (connected === 2) r();
              };
              client1.onopen = onOpen;
              client2.onopen = onOpen;
            });

            // 3. Emit event from one socket to room
            // We need to wait a small tick to ensure the sockets are joined in the internal map
            setTimeout(() => {
              if (senderSocket) {
                senderSocket.room("test-room").emit("test-event", {
                  message: "hello room",
                });
              }
            }, 100);

            // 4. Assert both clients receive event
            const [msg1, msg2] = await Promise.all([
              waitForMessage(client1),
              waitForMessage(client2),
            ]);

            assert(
              msg1.includes("hello room"),
              "Client 1 should receive message",
            );
            assert(
              msg2.includes("hello room"),
              "Client 2 should receive message",
            );

            client1.close();
            client2.close();
            resolve();
          } catch (e) {
            reject(e);
          }
        },
      });
    });
  } catch (error) {
    throw error;
  } finally {
    // Cleanup
    ac.abort();
    if (server) await server.finished;
  }
});

Deno.test("Broadcasting to room excludes sender", async () => {
  // Arrange
  const gossipRelay = new EventTargetGossipRelay();
  const wsConnHandler = new ConcreteWebSocketConnectionHandler({
    gossipRelay,
  });

  const ac = new AbortController();
  let server: Deno.HttpServer | undefined;
  // deno-lint-ignore no-explicit-any
  let senderSocket: any;

  // Helper to wait for a message on a WebSocket
  const waitForMessage = (ws: WebSocket, timeoutMs = 2000) => {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        ws.removeEventListener("message", listener);
        reject(new Error("Timeout waiting for message"));
      }, timeoutMs);

      const listener = (event: MessageEvent) => {
        if (
          typeof event.data === "string" && event.data.includes('"type":"ping"')
        ) return;
        clearTimeout(timer);
        ws.removeEventListener("message", listener);
        resolve(event.data);
      };
      ws.addEventListener("message", listener);
    });
  };

  try {
    // Act
    wsConnHandler.addSocketHandler((serverSocket) => {
      serverSocket.join("broadcast-room");
      if (!senderSocket) {
        senderSocket = serverSocket;
      }
    });

    await new Promise<void>((resolve, reject) => {
      server = Deno.serve({
        port: 8004,
        handler: (req: Request) => {
          return wsConnHandler.handleRequest(req);
        },
        signal: ac.signal,
        onListen: async () => {
          try {
            const client1 = new WebSocket("ws://localhost:8004"); // Sender
            await new Promise<void>((r) => client1.onopen = () => r());

            const client2 = new WebSocket("ws://localhost:8004"); // Receiver
            await new Promise<void>((r) => client2.onopen = () => r());

            setTimeout(() => {
              if (senderSocket) {
                senderSocket.room("broadcast-room").broadcast(
                  "broadcast-event",
                  {
                    message: "broadcast message",
                  },
                );
              }
            }, 100);

            // Assert Receiver gets message
            const msg2 = await waitForMessage(client2);
            assert(
              msg2.includes("broadcast message"),
              "Receiver should get message",
            );

            // Assert Sender does NOT get message
            try {
              await waitForMessage(client1, 500);
              throw new Error("Sender unexpectedly received message");
              // deno-lint-ignore no-explicit-any
            } catch (e: any) {
              assert(
                e.message === "Timeout waiting for message",
                "Sender should time out waiting for message",
              );
            }

            client1.close();
            client2.close();
            resolve();
          } catch (e) {
            reject(e);
          }
        },
      });
    });
  } catch (error) {
    throw error;
  } finally {
    ac.abort();
    if (server) await server.finished;
  }
});

Deno.test("Client leaves room and stops receiving events", async () => {
  // Arrange
  const gossipRelay = new EventTargetGossipRelay();
  const wsConnHandler = new ConcreteWebSocketConnectionHandler({
    gossipRelay,
  });

  const ac = new AbortController();
  let server: Deno.HttpServer | undefined;
  // deno-lint-ignore no-explicit-any
  let senderSocket: any;
  // deno-lint-ignore no-explicit-any
  let receiverSocket: any;

  // Helper to wait for a message on a WebSocket
  const waitForMessage = (ws: WebSocket, timeoutMs = 2000) => {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        ws.removeEventListener("message", listener);
        reject(new Error("Timeout waiting for message"));
      }, timeoutMs);

      const listener = (event: MessageEvent) => {
        if (
          typeof event.data === "string" && event.data.includes('"type":"ping"')
        ) return;
        clearTimeout(timer);
        ws.removeEventListener("message", listener);
        resolve(event.data);
      };
      ws.addEventListener("message", listener);
    });
  };

  try {
    // Act
    wsConnHandler.addSocketHandler((serverSocket) => {
      serverSocket.join("leave-test-room");
      if (!senderSocket) {
        senderSocket = serverSocket;
      } else {
        receiverSocket = serverSocket;
      }
    });

    await new Promise<void>((resolve, reject) => {
      server = Deno.serve({
        port: 8005,
        handler: (req: Request) => {
          return wsConnHandler.handleRequest(req);
        },
        signal: ac.signal,
        onListen: async () => {
          try {
            const client1 = new WebSocket("ws://localhost:8005"); // Sender
            await new Promise<void>((r) => client1.onopen = () => r());

            const client2 = new WebSocket("ws://localhost:8005"); // Receiver
            await new Promise<void>((r) => client2.onopen = () => r());

            // 1. Send first message
            setTimeout(() => {
              if (senderSocket) {
                senderSocket.room("leave-test-room").emit("test-event", {
                  message: "first message",
                });
              }
            }, 100);

            // Verify BOTH receive it
            const [msg1_a, msg2_a] = await Promise.all([
              waitForMessage(client1),
              waitForMessage(client2),
            ]);
            assert(
              msg1_a.includes("first message"),
              "Client 1 should get first message",
            );
            assert(
              msg2_a.includes("first message"),
              "Client 2 should get first message",
            );

            // 2. Client 2 leaves room (server-side action)
            if (receiverSocket) {
              receiverSocket.leave("leave-test-room");
            }

            // 3. Send second message
            setTimeout(() => {
              if (senderSocket) {
                senderSocket.room("leave-test-room").emit("test-event", {
                  message: "second message",
                });
              }
            }, 100);

            // Verify Client 1 gets it (it's still in room)
            const msg1_b = await waitForMessage(client1);
            assert(
              msg1_b.includes("second message"),
              "Client 1 should get second message",
            );

            // Verify Client 2 does NOT get it
            try {
              await waitForMessage(client2, 500);
              throw new Error("Client 2 unexpectedly received second message");
            } catch (e: unknown) {
              assert(
                e instanceof Error &&
                  e.message === "Timeout waiting for message",
                "Client 2 should time out (not receive message)",
              );
            }

            client1.close();
            client2.close();
            resolve();
          } catch (e) {
            reject(e);
          }
        },
      });
    });
  } catch (error) {
    throw error;
  } finally {
    ac.abort();
    if (server) await server.finished;
  }
});

Deno.test("Client leaves all rooms", async () => {
  // Arrange
  const gossipRelay = new EventTargetGossipRelay();
  const wsConnHandler = new ConcreteWebSocketConnectionHandler({
    gossipRelay,
  });

  const ac = new AbortController();
  let server: Deno.HttpServer | undefined;
  // deno-lint-ignore no-explicit-any
  let senderSocket: any;
  // deno-lint-ignore no-explicit-any
  let receiverSocket: any;

  // Helper to wait for a message on a WebSocket
  const waitForMessage = (ws: WebSocket, timeoutMs = 2000) => {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        ws.removeEventListener("message", listener);
        reject(new Error("Timeout waiting for message"));
      }, timeoutMs);

      const listener = (event: MessageEvent) => {
        if (
          typeof event.data === "string" && event.data.includes('"type":"ping"')
        ) return;
        clearTimeout(timer);
        ws.removeEventListener("message", listener);
        resolve(event.data);
      };
      ws.addEventListener("message", listener);
    });
  };

  try {
    // Act
    wsConnHandler.addSocketHandler((serverSocket) => {
      serverSocket.join("room-a");
      serverSocket.join("room-b");
      if (!senderSocket) {
        senderSocket = serverSocket;
      } else {
        receiverSocket = serverSocket;
      }
    });

    await new Promise<void>((resolve, reject) => {
      server = Deno.serve({
        port: 8006,
        handler: (req: Request) => {
          return wsConnHandler.handleRequest(req);
        },
        signal: ac.signal,
        onListen: async () => {
          try {
            const client1 = new WebSocket("ws://localhost:8006"); // Sender
            await new Promise<void>((r) => client1.onopen = () => r());

            const client2 = new WebSocket("ws://localhost:8006"); // Receiver
            await new Promise<void>((r) => client2.onopen = () => r());

            // 1. Broadcast to room-a
            if (senderSocket) {
              senderSocket.room("room-a").broadcast("test-event-a", {
                msg: "A",
              });
            }
            const msgA = await waitForMessage(client2);
            assert(
              msgA.includes("A"),
              "Client 2 should receive message from room-a",
            );

            // 2. Broadcast to room-b
            if (senderSocket) {
              senderSocket.room("room-b").broadcast("test-event-b", {
                msg: "B",
              });
            }
            const msgB = await waitForMessage(client2);
            assert(
              msgB.includes("B"),
              "Client 2 should receive message from room-b",
            );

            // 3. Client 2 leaves all rooms
            if (receiverSocket) {
              receiverSocket.leaveAllRooms();
            }

            // 4. Verify negative for room-a
            if (senderSocket) {
              senderSocket.room("room-a").broadcast("test-event-a-2", {
                msg: "A2",
              });
            }
            try {
              await waitForMessage(client2, 500);
              throw new Error("Client 2 unexpectedly received A2");
            } catch (e: unknown) {
              assert(
                e instanceof Error &&
                  e.message === "Timeout waiting for message",
                "Client 2 should not receive A2",
              );
            }

            // 5. Verify negative for room-b
            if (senderSocket) {
              senderSocket.room("room-b").broadcast("test-event-b-2", {
                msg: "B2",
              });
            }
            try {
              await waitForMessage(client2, 500);
              throw new Error("Client 2 unexpectedly received B2");
            } catch (e: unknown) {
              assert(
                e instanceof Error &&
                  e.message === "Timeout waiting for message",
                "Client 2 should not receive B2",
              );
            }

            client1.close();
            client2.close();
            resolve();
          } catch (e) {
            reject(e);
          }
        },
      });
    });
  } catch (error) {
    throw error;
  } finally {
    ac.abort();
    if (server) await server.finished;
  }
});

Deno.test("Client sends event to another client", async () => {
  // Arrange
  const gossipRelay = new EventTargetGossipRelay();
  const wsConnHandler = new ConcreteWebSocketConnectionHandler({
    gossipRelay,
  });

  const ac = new AbortController();
  let server: Deno.HttpServer | undefined;
  // deno-lint-ignore no-explicit-any
  let senderSocket: any;
  // deno-lint-ignore no-explicit-any
  let receiverSocket: any;

  // Helper to wait for a message on a WebSocket
  const waitForMessage = (ws: WebSocket, timeoutMs = 2000) => {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        ws.removeEventListener("message", listener);
        reject(new Error("Timeout waiting for message"));
      }, timeoutMs);

      const listener = (event: MessageEvent) => {
        if (
          typeof event.data === "string" && event.data.includes('"type":"ping"')
        ) return;
        clearTimeout(timer);
        ws.removeEventListener("message", listener);
        resolve(event.data);
      };
      ws.addEventListener("message", listener);
    });
  };

  try {
    // Act
    wsConnHandler.addSocketHandler((serverSocket) => {
      if (!senderSocket) {
        senderSocket = serverSocket;
      } else {
        receiverSocket = serverSocket;
      }
    });

    await new Promise<void>((resolve, reject) => {
      server = Deno.serve({
        port: 8007,
        handler: (req: Request) => {
          return wsConnHandler.handleRequest(req);
        },
        signal: ac.signal,
        onListen: async () => {
          try {
            const client1 = new WebSocket("ws://localhost:8007"); // Sender
            await new Promise<void>((r) => client1.onopen = () => r());

            const client2 = new WebSocket("ws://localhost:8007"); // Receiver
            await new Promise<void>((r) => client2.onopen = () => r());

            // 1. Sender emits to Receiver's ID
            setTimeout(() => {
              if (senderSocket && receiverSocket) {
                console.log("Sender ID:", senderSocket.id);
                console.log("Receiver ID:", receiverSocket.id);
                // Assuming serverSocket interface has toSocket(id).emit(...)
                senderSocket.toSocket(receiverSocket.id).emit("p2p-event", {
                  message: "direct message",
                });
              } else {
                reject(new Error("Sockets not captured correctly"));
              }
            }, 200);

            // Verify Receiver gets it
            const msg2 = await waitForMessage(client2);
            assert(
              msg2.includes("direct message"),
              "Client 2 should receive direct message",
            );

            client1.close();
            client2.close();
            resolve();
          } catch (e) {
            reject(e);
          }
        },
      });
    });
  } catch (error) {
    throw error;
  } finally {
    ac.abort();
    if (server) await server.finished;
  }
});

Deno.test("Server emits to specific socket", async () => {
  // Arrange
  const gossipRelay = new EventTargetGossipRelay();
  const wsConnHandler = new ConcreteWebSocketConnectionHandler({
    gossipRelay,
  });

  const ac = new AbortController();
  let server: Deno.HttpServer | undefined;
  let serverIO: ServerIO | undefined;
  let receiverId: string | undefined;

  // Helper to wait for a message on a WebSocket
  const waitForMessage = (ws: WebSocket, timeoutMs = 2000) => {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        ws.removeEventListener("message", listener);
        reject(new Error("Timeout waiting for message"));
      }, timeoutMs);

      const listener = (event: MessageEvent) => {
        if (
          typeof event.data === "string" && event.data.includes('"type":"ping"')
        ) return;
        clearTimeout(timer);
        ws.removeEventListener("message", listener);
        resolve(event.data);
      };
      ws.addEventListener("message", listener);
    });
  };

  try {
    // Act
    wsConnHandler.addSocketHandler((serverSocket, io) => {
      serverIO = io;
      receiverId = serverSocket.id;
    });

    await new Promise<void>((resolve, reject) => {
      server = Deno.serve({
        port: 8008,
        handler: (req: Request) => {
          return wsConnHandler.handleRequest(req);
        },
        signal: ac.signal,
        onListen: async () => {
          try {
            const client1 = new WebSocket("ws://localhost:8008");
            await new Promise<void>((r) => client1.onopen = () => r());

            // 1. Server emits to client
            setTimeout(() => {
              if (serverIO && receiverId) {
                serverIO.toSocket(receiverId).emit("server-event", {
                  message: "hello from server",
                });
              } else {
                reject(new Error("IO or socket ID not captured"));
              }
            }, 100);

            // Verify client gets it
            const msg = await waitForMessage(client1);
            assert(
              msg.includes("hello from server"),
              "Client should receive server message",
            );

            client1.close();
            resolve();
          } catch (e) {
            reject(e);
          }
        },
      });
    });
  } catch (error) {
    throw error;
  } finally {
    ac.abort();
    if (server) await server.finished;
  }
});

Deno.test("Server emits to room", async () => {
  // Arrange
  const gossipRelay = new EventTargetGossipRelay();
  const wsConnHandler = new ConcreteWebSocketConnectionHandler({
    gossipRelay,
  });

  const ac = new AbortController();
  let server: Deno.HttpServer | undefined;
  let serverIO: ServerIO | undefined;

  const waitForMessage = (ws: WebSocket, timeoutMs = 2000) => {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        ws.removeEventListener("message", listener);
        reject(new Error("Timeout waiting for message"));
      }, timeoutMs);

      const listener = (event: MessageEvent) => {
        if (
          typeof event.data === "string" && event.data.includes('"type":"ping"')
        ) return;
        clearTimeout(timer);
        ws.removeEventListener("message", listener);
        resolve(event.data);
      };
      ws.addEventListener("message", listener);
    });
  };

  try {
    wsConnHandler.addSocketHandler((serverSocket, io) => {
      serverIO = io;
      serverSocket.join("global-room");
    });

    await new Promise<void>((resolve, reject) => {
      server = Deno.serve({
        port: 8009,
        handler: (req: Request) => {
          return wsConnHandler.handleRequest(req);
        },
        signal: ac.signal,
        onListen: async () => {
          try {
            const client1 = new WebSocket("ws://localhost:8009");
            await new Promise<void>((r) => client1.onopen = () => r());

            const client2 = new WebSocket("ws://localhost:8009");
            await new Promise<void>((r) => client2.onopen = () => r());

            // 1. Server emits to room
            setTimeout(() => {
              if (serverIO) {
                serverIO.room("global-room").emit("room-event", {
                  message: "hello room",
                });
              } else {
                reject(new Error("IO not captured"));
              }
            }, 100);

            // Verify both get it
            await Promise.all([
              waitForMessage(client1).then((msg) =>
                assert(
                  msg.includes("hello room"),
                  "Client 1 should receive room message",
                )
              ),
              waitForMessage(client2).then((msg) =>
                assert(
                  msg.includes("hello room"),
                  "Client 2 should receive room message",
                )
              ),
            ]);

            client1.close();
            client2.close();
            resolve();
          } catch (e) {
            reject(e);
          }
        },
      });
    });
  } catch (error) {
    throw error;
  } finally {
    ac.abort();
    if (server) await server.finished;
  }
});
