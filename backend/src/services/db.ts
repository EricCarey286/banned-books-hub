import mysql from "mysql2/promise";
import { DB_CONFIG } from "../utils/config";
require("dotenv").config();

const pool = mysql.createPool(DB_CONFIG.db);

/**
 * Executes a SQL query using the provided SQL statement and parameters.
 *
 * This function attempts to execute a SQL query against a database using the `pool.execute` method.
 * It handles both array and single result scenarios, returning an array of results in either case.
 * If an error occurs during the execution, it logs the error and rethrows it for further handling.
 *
 * @param sql - The SQL statement to be executed.
 * @param params - The parameters for the SQL query.
 */
export default async function query(sql: any, params: any) {
  try {
    const [results] = await pool.execute(sql, params);

    return Array.isArray(results) ? results : [results];
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}
