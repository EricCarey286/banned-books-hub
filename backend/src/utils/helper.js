"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.getOffset = getOffset;
exports.emptyOrRows = emptyOrRows;
function getOffset(currentPage, listPerPage) {
    return (currentPage - 1) * listPerPage;
}
function emptyOrRows(rows) {
    if (!rows) {
        return [];
    }
    return rows;
}
class AppError extends Error {
    statusCode;
    details;
    constructor(message, statusCode, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        // Maintain proper stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
