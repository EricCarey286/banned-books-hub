import mysql from "mysql2/promise";
import { TEST_CONFIG } from "../utils/config";
require("dotenv").config();

const pool = mysql.createPool(TEST_CONFIG.test_db);

export default async function query(sql: any, params: any) {
  try {
    const [results] = await pool.execute(sql, params);

    return Array.isArray(results) ? results : [results];
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}
