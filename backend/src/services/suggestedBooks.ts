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
}

export async function getMultiple(page: number = 1) {
  const limit = DB_CONFIG.listPerPage;
  try {
    if (isNaN(page) || page <= 0) {
      throw new AppError("Invalid 'page' parameter. It must be a positive integer.", 400);
    }

    const offset = getOffset(page, limit);
    const rows = await query("CALL sp_get_suggested_books(?, ?)", [
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
    const rows = await query(`CALL sp_search_sugg_books_by_param(?)`, [regex]);
    const data = emptyOrRows(rows);
    return { data };
  } catch (err: any) {
    console.error("Error in getBook:", err);
    throw err;
  }
}

export async function suggest(book: Book) {
  let invalidFields: string[] = [];

  try {
    if (!book.title || typeof book.title !== "string" || book.title.trim().length === 0) {
      invalidFields.push('title');
    }
    if (!book.author || typeof book.author !== "string" || book.author.trim().length === 0) {
      invalidFields.push('author');
    }
    if (!book.banned_by && typeof book.banned_by !== "string" || book.banned_by.trim().length === 0) {
      invalidFields.push('banned_by');
    }

    if (invalidFields.length > 0) {
      throw new AppError("Validation failed", 400, {
        details: "Required fields are missing or of invalid format.",
        invalidFields,
      });
    }

    const result = await query("CALL sp_insert_suggested_book(?, ?, ?, ?, ?, ?)", [
      book.isbn,
      book.title,
      book.author,
      book.description,
      book.ban_reason,
      book.banned_by,
    ]);

    const affectedRows = (result[0] as mysql.ResultSetHeader).affectedRows || 0;

    if (affectedRows) {
      return { message: `New suggested book: ${book.title} created successfully` };
    } else {
      throw new AppError("Creation of suggested book failed", 500, {
        details: 'Suggested book failed to create in database',
      });
    }
  } catch (err: any) {
    console.error("Error in suggest:", err);
    throw err;
  }
}

export async function remove(id: Number) {
  try {
    const result = await query("CALL sp_delete_sugg_book(?)", [id]);

    const affectedRows = (result[0] as mysql.ResultSetHeader).affectedRows || 0;

    if (affectedRows) {
      return { message: `Suggested book with id: ${id} deleted successfully` };
    } else {
      throw new AppError(`Suggested book with id: ${id} not found`, 404);
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
    const result = await query("CALL sp_delete_sugg_books(?)", [idString]);

    const affectedRows = (result[0] as mysql.ResultSetHeader).affectedRows || 0;

    if (!affectedRows) {
      throw new AppError("No records deleted — IDs may not exist", 404);
    }

    return { message: `Suggested books with IDs: ${ids.join(", ")} deleted successfully` };
  } catch (err: any) {
    console.error("Error in removeMultiple:", err);
    throw err;
  }
}
