import mysql from "mysql2/promise";
import { DB_CONFIG } from "../utils/config";
require("dotenv").config();

export default async function query(sql: any, params: any) {
  try {
    const connection = await mysql.createConnection({
      ...DB_CONFIG.db,
      authPlugins: {
        caching_sha2_password: mysql.authPlugins.caching_sha2_password({
          //fix sha2
          serverPublicKey: process.env.PUBLIC_KEY,
          overrideIsSecure: true,
        }),
      },
    });
    const [results] = await connection.execute(sql, params);

    console.log("Database configuration:", connection);

    return Array.isArray(results) ? results : [results];
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}
