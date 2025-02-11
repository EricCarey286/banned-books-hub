"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = query;
const promise_1 = __importDefault(require("mysql2/promise"));
const config_1 = require("../utils/config");
require("dotenv").config();
const pool = promise_1.default.createPool(config_1.DB_CONFIG.db);
async function query(sql, params) {
    try {
        const [results] = await pool.execute(sql, params);
        return Array.isArray(results) ? results : [results];
    }
    catch (error) {
        console.error("Database query error:", error);
        throw error;
    }
}
