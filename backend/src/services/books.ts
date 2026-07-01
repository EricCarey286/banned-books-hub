import mysql from 'mysql2/promise';
import query from "./db";
import { getOffset, emptyOrRows, AppError } from "../utils/helper";
import { DB_CONFIG } from "../utils/config";

interface Book {
  isbn: string;
  title: string;
  author: string;
  description: string;
  ban_reason: string;
  banned_by: string;
  cover_url: string;
}

export async function getMultiple(page: number = 1) {
  const limit = DB_CONFIG.listPerPage;
  try {
    if (isNaN(page) || page <= 0) {
      throw new AppError("Invalid 'page' parameter. It must be a positive integer.", 400);
    }

    const offset = getOffset(page, limit);
    const rows = await query("CALL sp_get_books(?, ?)", [
      offset,
      limit + 1,
    ]);
    const data = emptyOrRows(rows);

    const books = data[0].slice(0, limit);
    const hasNextPage = data[0].length > limit;

    return {
      data: books,
      meta: { page, hasNextPage },
    };
  } catch (err: any) {
    console.error("Error in getMultiple:", err);
    throw err;
  }
}

export async function getBook(searchTerm: string) {
  try {
    if (typeof searchTerm !== "string" || searchTerm.trim() === "") {
      throw new AppError("Invalid searchTerm parameter. It must be a non-empty string.", 400);
    }

    const regex = "%" + searchTerm + "%";
    const rows = await query(`CALL sp_search_books_by_param(?)`, [regex]);
    const data = emptyOrRows(rows);
    return {
      data,
    };
  } catch (err: any) {
    console.error("Error in getBook:", err);
    throw err;
  }
}

export async function getFeaturedBook() {
  try {
    const rows = await query(`CALL sp_search_for_featured`, []);
    const data = emptyOrRows(rows);
    return {
      data,
    };
  } catch (err: any) {
    console.error("Error in getFeaturedBook:", err);
    throw err;
  }
}

export async function create(book: Book) {
  let invalidFields: string[] = [];

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
      throw new AppError("Validation failed", 400, {
        details: "Required fields are missing or of invalid format.",
        invalidFields,
      });
    }

    const result = await query("CALL sp_insert_book(?, ?, ?, ?, ?, ?, ?)", [
      book.isbn,
      book.title,
      book.author,
      book.description,
      book.ban_reason,
      book.banned_by,
      book.cover_url ?? null
    ]);

    const affectedRows = (result[0] as mysql.ResultSetHeader).affectedRows || 0;

    if (affectedRows) {
      return { message: `New book: ${book.title} created successfully` };
    } else {
      throw new AppError("Creation failed", 500, {
        details: 'Book failed to create in database',
      });
    }
  } catch (err: any) {
    console.error("Error in create:", err);
    throw err;
  }
}

export async function update(id: Number, book: Book) {
  try {
    if (!book.title && !book.author && !book.description && !book.ban_reason && !book.banned_by) {
      throw new AppError("At least one field must be provided to update.", 400, {
        validFields: ['title', 'author', 'description', 'ban_reason', 'banned_by'],
      });
    }

    const errors: string[] = [];

    if (book.title && (typeof book.title !== 'string' || book.title.trim().length === 0)) {
      errors.push('Title must be a non-empty string.');
    }
    if (book.author && (typeof book.author !== 'string' || book.author.trim().length === 0)) {
      errors.push('Author must be a non-empty string.');
    }
    if (book.description && (typeof book.description !== 'string' || book.description.trim().length === 0)) {
      errors.push('Description must be a non-empty string.');
    }
    if (book.ban_reason && (typeof book.ban_reason !== 'string' || book.ban_reason.trim().length === 0)) {
      errors.push('Ban reason must be a non-empty string.');
    }
    if (book.banned_by && (typeof book.banned_by !== 'string' || book.banned_by.trim().length === 0)) {
      errors.push('Banned by must be a non-empty string.');
    }

    if (errors.length > 0) {
      throw new AppError('Validation Failed', 400, { details: errors });
    }

    const title = book.title || null;
    const author = book.author || null;
    const description = book.description || null;
    const ban_reason = book.ban_reason || null;
    const banned_by = book.banned_by || null;

    const result = await query("CALL sp_update_book(?, ?, ?, ?, ?, ?)", [
      id, title, author, description, ban_reason, banned_by,
    ]);

    const affectedRows = (result[0] as mysql.ResultSetHeader).affectedRows || 0;

    if (affectedRows) {
      return { message: `Book with id: ${id} updated successfully` };
    } else {
      throw new AppError(`Book with id: ${id} not found`, 404, {
        details: 'No record was updated — the ID may not exist'
      });
    }
  } catch (err: any) {
    console.error("Error in update:", err);
    throw err;
  }
}

export async function remove(id: Number) {
  try {
    const result = await query("CALL sp_delete_book(?)", [id]);

    const affectedRows = (result[0] as mysql.ResultSetHeader).affectedRows || 0;

    if (affectedRows) {
      return { message: `Book with id: ${id} deleted successfully` };
    } else {
      throw new AppError(`Book with id: ${id} not found`, 404);
    }
  } catch (err: any) {
    console.error("Error in remove:", err);
    throw err;
  }
}

export async function removeMultiple(ids: number[]) {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError("Invalid input: 'ids' must be a non-empty array", 400);
    }

    const idString = ids.join(",");
    const result = await query("CALL sp_delete_books(?)", [idString]);

    const affectedRows = (result[0] as mysql.ResultSetHeader).affectedRows || 0;

    if (!affectedRows) {
      throw new AppError("No records deleted — IDs may not exist", 404);
    }

    return { message: `Books with IDs: ${ids.join(", ")} deleted successfully` };
  } catch (err: any) {
    console.error("Error in removeMultiple:", err);
    throw err;
  }
}
