import { parseArgs } from "@std/cli";
import mysql from "mysql2/promise";

const args = parseArgs(Deno.args, {
  string: ["url", "host", "port", "user", "password", "database"],
  alias: {
    url: "mysql-url",
    host: "mysql-host",
    port: "mysql-port",
    user: "mysql-user",
    password: "mysql-pw",
    database: "mysql-db",
  },
  default: {
    url: Deno.env.get("MYSQL_URL"),
    host: Deno.env.get("MYSQL_HOST") || "localhost",
    port: Deno.env.get("MYSQL_PORT") || "3306",
    user: Deno.env.get("MYSQL_USER") || "root",
    password: Deno.env.get("MYSQL_PASSWORD"),
    database: Deno.env.get("MYSQL_DATABASE"),
  },
});

function createConnectionsPool() {
  return args.url ? mysql.createPool({ uri: args.url }) : mysql.createPool({
    host: args.host,
    port: Number(args.port),
    user: args.user,
    password: args.password,
    database: args.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    typeCast(field, next) {
      // Casting BOOLEAN columns into native javascript boolean instead of numbers 0|1
      if (field.type === "TINY" && field.length === 1) {
        return field.string() === "1";
      }
      // Casting TIMESTAMP fields into string instead of native Date objects
      if (field.type === "TIMESTAMP") {
        return field.string();
      }
      return next();
    },
  });
}

let pool: mysql.Pool | null = null;

export default function getConnectionsPool(): mysql.Pool {
  if (!pool) {
    pool = createConnectionsPool();
  }
  return pool;
}

export function resetConnectionsPool() {
  pool = createConnectionsPool();
}
