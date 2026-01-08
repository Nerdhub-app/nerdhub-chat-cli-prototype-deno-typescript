import { parseArgs } from "@std/cli";
import mysql from "mysql2/promise";
import {
  MYSQL_DATABASE,
  MYSQL_HOST,
  MYSQL_PASSWORD,
  MYSQL_PORT,
  MYSQL_URI,
  MYSQL_USER,
} from "../configs/db.config.ts";

const args = parseArgs(Deno.args, {
  string: [
    "mysql-uri",
    "mysql-host",
    "mysql-port",
    "mysql-user",
    "mysql-pw",
    "mysql-db",
  ],
  default: {
    "mysql-uri": MYSQL_URI,
    "mysql-host": MYSQL_HOST,
    "mysql-port": MYSQL_PORT,
    "mysql-user": MYSQL_USER,
    "mysql-pw": MYSQL_PASSWORD,
    "mysql-db": MYSQL_DATABASE,
  },
});

/**
 * @returns MySQL connection pool
 */
function createConnectionsPool() {
  return args["mysql-uri"]
    ? mysql.createPool({ uri: args["mysql-uri"] })
    : mysql.createPool({
      host: args["mysql-host"],
      port: Number(args["mysql-port"]),
      user: args["mysql-user"],
      password: args["mysql-pw"],
      database: args["mysql-db"],
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

// MySQL connection pool singleton
let pool: mysql.Pool | null = null;

/**
 * @returns MySQL connection pool
 */
export default function injectConnectionsPool(): mysql.Pool {
  if (!pool) {
    pool = createConnectionsPool();
  }
  return pool;
}

/**
 * Reset MySQL connection pool
 */
export function resetConnectionsPool() {
  pool = createConnectionsPool();
}
