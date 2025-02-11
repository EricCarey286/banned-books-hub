"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMultiple = getMultiple;
exports.getBook = getBook;
exports.create = create;
exports.update = update;
exports.remove = remove;
const db_1 = __importDefault(require("./db"));
const helper_1 = require("../utils/helper");
const config_1 = require("../utils/config");
//query multiple books per page
async function getMultiple(page = 1) {
    try {
        if (isNaN(page) || page <= 0) {
            throw new helper_1.AppError("Invalid 'page' parameter. It must be a positive integer.", 501);
        }
        const offset = (0, helper_1.getOffset)(page, config_1.DB_CONFIG.listPerPage);
        const rows = await (0, db_1.default)("CALL sp_get_books(?, ?)", [
            offset,
            config_1.DB_CONFIG.listPerPage,
        ]);
        const data = (0, helper_1.emptyOrRows)(rows);
        const meta = { page };
        return {
            data,
            meta,
        };
    }
    catch (err) {
        console.error("Error in getMultiple:", err);
        throw err;
    }
}
//get a single book based on search criteria
async function getBook(searchTerm) {
    try {
        if (typeof searchTerm !== "string" || searchTerm.trim() === "") {
            throw new helper_1.AppError("Invalid searchTerm parameter. It must be a non-empty string.", 501);
        }
        const regex = "%" + searchTerm + "%";
        const rows = await (0, db_1.default)(`CALL sp_search_books_by_param(?)`, [regex]);
        const data = (0, helper_1.emptyOrRows)(rows);
        return {
            data,
        };
    }
    catch (err) {
        console.error("Error in getBook:", err);
        throw err;
    }
}
//create a book
async function create(book) {
    let invalidFields = [];
    try {
        if (!book.isbn || typeof book.isbn !== "string" || book.isbn.trim().length === 0) {
            invalidFields.push('isbn');
        }
        if (!book.title || typeof book.title !== "string" || book.title.trim().length === 0) {
            invalidFields.push('title');
        }
        if (!book.author || typeof book.author !== "string" || book.author.trim().length === 0) {
            invalidFields.push('author');
        }
        if (!book.banned_by && typeof book.banned_by !== "string" || book.banned_by.trim().length === 0) {
            invalidFields.push('banned_by');
        }
        if (book.description !== undefined && typeof book.description !== "string") {
            invalidFields.push('description');
        }
        if (book.ban_reason !== undefined && typeof book.ban_reason !== "string") {
            invalidFields.push('ban_reason');
        }
        if (invalidFields.length > 0) {
            throw new helper_1.AppError("Validation failed", 501, {
                details: "Required fields are missing or of invalid format.",
                invalidFields: invalidFields,
            });
        }
        const result = await (0, db_1.default)("CALL sp_insert_book(?, ?, ?, ?, ?, ?)", [
            book.isbn,
            book.title,
            book.author,
            book.description,
            book.ban_reason,
            book.banned_by,
        ]);
        let message = "Error in creating book entry";
        const affectedRows = result[0].affectedRows || 0;
        if (affectedRows) {
            message = `New book: ${book.title} created successfully`;
        }
        else {
            throw new helper_1.AppError("Creation failed", 501, {
                details: 'Book failed to create in database',
            });
        }
        return { message };
    }
    catch (err) {
        console.error("Error in create:", err);
        throw err;
    }
}
//update an existing book by id
async function update(id, book) {
    try {
        // Validate the input: ensure at least one field is provided
        if (!book.title && !book.author && !book.description && !book.ban_reason && !book.banned_by) {
            throw new helper_1.AppError("At least one field must be provided to update.", 501, {
                validFields: ['title', 'author', 'description', 'ban_reason', 'banned_by'],
            });
        }
        const errors = [];
        if (book.title && (typeof book.title !== 'string' || book.title.trim().length === 0)) {
            errors.push('Title must be a non-empty string.');
        }
        if (book.author && (typeof book.author !== 'string' || book.author.trim().length === 0)) {
            errors.push('Author must be a non-empty string.');
        }
        if (book.description && (typeof book.description !== 'string' || book.description.trim().length === 0)) {
            errors.push('Description must be anon-empty string.');
        }
        if (book.ban_reason && (typeof book.ban_reason !== 'string' || book.ban_reason.trim().length === 0)) {
            errors.push('Ban reason must be a non-empty string.');
        }
        if (book.banned_by && (typeof book.banned_by !== 'string' || book.banned_by.trim().length === 0)) {
            errors.push('Banned by must be a non-empty string.');
        }
        if (errors.length > 0) {
            throw new helper_1.AppError('Validation Failed', 501, {
                details: errors,
            });
        }
        // Assign `null` to missing fields to satisfy the stored procedure requirements
        const title = book.title || null;
        const author = book.author || null;
        const description = book.description || null;
        const ban_reason = book.ban_reason || null;
        const banned_by = book.banned_by || null;
        const result = await (0, db_1.default)("CALL sp_update_book(?, ?, ?, ?, ?, ?)", [
            id,
            title,
            author,
            description,
            ban_reason,
            banned_by,
        ]);
        let message = '';
        const affectedRows = result[0].affectedRows || 0;
        if (affectedRows) {
            message = `Book with id: ${id} updated successfully`;
            return { message };
        }
        else {
            throw new helper_1.AppError(`Error updating book with id: ${id}`, 501, {
                details: 'Query failed to update an existing book'
            });
        }
    }
    catch (err) {
        console.error("Error in update:", err);
        throw err;
    }
}
//remove an existing book by id
async function remove(id) {
    try {
        const result = await (0, db_1.default)("CALL sp_delete_book(?)", [id]);
        let message = '';
        const affectedRows = result[0].affectedRows || 0;
        if (affectedRows) {
            message = `Book with id: ${id} deleted successfully`;
            return { message };
        }
        else {
            throw new helper_1.AppError(`Error deleting book with id: ${id}`, 501);
        }
    }
    catch (err) {
        console.error("Error in remove:", err);
        throw err;
    }
}
