import mysql from "mysql2/promise";
import { DB_CONFIG } from "../utils/config";
require("dotenv").config();

const pool = mysql.createPool(DB_CONFIG.db);

export default async function query(sql: any, params: any) {
  console.log('here - query');
  try {
    const [results] = await pool.execute(sql, params);

    return Array.isArray(results) ? results : [results];
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}
