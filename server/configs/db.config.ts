export const MYSQL_URI = Deno.env.get("MYSQL_URI");
export const MYSQL_HOST = Deno.env.get("MYSQL_HOST") ?? "localhost";
export const MYSQL_PORT = Deno.env.get("MYSQL_PORT")
  ? Number(Deno.env.get("MYSQL_PORT"))
  : 3306;
export const MYSQL_USER = Deno.env.get("MYSQL_USER") ?? "root";
export const MYSQL_PASSWORD = Deno.env.get("MYSQL_PASSWORD");
export const MYSQL_DATABASE = Deno.env.get("MYSQL_DATABASE");
