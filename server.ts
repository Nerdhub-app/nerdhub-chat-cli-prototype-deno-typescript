import { parseArgs } from "@std/cli";
import { AuthController, ChatController } from "@scope/server";
import { initKV } from "./server/database/kv.connection.ts";

const args = parseArgs(Deno.args, {
  string: ["port", "kv"],
  boolean: ["local-kv"],
  default: {
    port: Deno.env.get("PORT") || "8000",
    kv: Deno.env.get("KV_PATH"),
  },
});

await initKV({
  isLocal: args["local-kv"],
  path: args.kv,
});

const PORT = parseInt(args.port);

Deno.serve({ port: PORT }, async (req) => {
  try {
    const pathname = req.url.replace(/^\w+:\/\/(\w|\d|:|-|_)+\/?/, "/");

    switch (pathname) {
      case "/chat": {
        return ChatController.handleChatHandshake(req);
      }

      case "/register": {
        return await AuthController.handleRegistration(req);
      }

      case "/login": {
        return await AuthController.handleLogin(req);
      }

      case "/me": {
        return await AuthController.handleGetAuthUser(req);
      }

      default: {
        return new Response(JSON.stringify({ error: "Route not found" }), {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        });
      }
    }
  } catch (error) {
    const err = error as Error;
    console.log(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
});
