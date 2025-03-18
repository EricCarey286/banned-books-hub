import mysql from 'mysql2/promise';
import query from "./db";
import { getOffset, emptyOrRows, AppError } from "../utils/helper";
import { DB_CONFIG } from "../utils/config";

//Type Interface Library
interface Book {
  isbn: String;
  title: String;
  author: String;
  description: String;
  ban_reason: String;
  banned_by: String;
}

//query multiple books per page
export async function getMultiple(page: number = 1) {
  const limit = DB_CONFIG.listPerPage;
  try {
    if (isNaN(page) || page <= 0) {
      throw new AppError("Invalid 'page' parameter. It must be a positive integer.", 501);
    }

    const offset = getOffset(page, limit);
    const rows = await query("CALL sp_get_books(?, ?)", [
      offset,
      limit + 1,
    ]);
    const data = emptyOrRows(rows);

    const books = data[0].slice(0, limit); // Keep only 10 books
    const hasNextPage = data[0].length > limit; // If 11 books, there is another page

    return {
      data: books,
      meta: { page, hasNextPage },
    };
  } catch (err: any) {
    console.error("Error in getMultiple:", err);
    throw err;
  }
}

//get a single book based on search criteria
export async function getBook(searchTerm: string) {
  try {
    if (typeof searchTerm !== "string" || searchTerm.trim() === "") {
      throw new AppError("Invalid searchTerm parameter. It must be a non-empty string.", 501);
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

//get a single featured book
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

//create a book
export async function create(book: Book) {
  let invalidFields: any = [];

  try {
    if (!book.isbn || typeof book.isbn !== "string" || book.isbn.trim().length === 0) {
      invalidFields.push('isbn');
    }
    if (!book.title || typeof book.title !== "string" || book.title.trim().length === 0) {
      invalidFields.push('title')
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
      throw new AppError("Validation failed", 501, {
        details: "Required fields are missing or of invalid format.",
        invalidFields: invalidFields,
      });
    }

    const result = await query("CALL sp_insert_book(?, ?, ?, ?, ?, ?)", [
      book.isbn,
      book.title,
      book.author,
      book.description,
      book.ban_reason,
      book.banned_by,
    ]);

    let message = "Error in creating book entry";

    const affectedRows = (result[0] as mysql.ResultSetHeader).affectedRows || 0;

    if (affectedRows) {
      message = `New book: ${book.title} created successfully`;
    } else {
      throw new AppError("Creation failed", 501,{
        details: 'Book failed to create in database',
      });
    }

    return { message };
  } catch (err: any) {
    console.error("Error in create:", err);
    throw err;
  }
}

//update an existing book by id
export async function update(id: Number, book: Book) {
  try {
    // Validate the input: ensure at least one field is provided
    if (!book.title && !book.author && !book.description && !book.ban_reason && !book.banned_by) {
      throw new AppError("At least one field must be provided to update.", 501, {
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
      errors.push('Description must be anon-empty string.');
    }

    if (book.ban_reason && (typeof book.ban_reason !== 'string' || book.ban_reason.trim().length === 0)) {
      errors.push('Ban reason must be a non-empty string.');
    }

    if (book.banned_by && (typeof book.banned_by !== 'string' || book.banned_by.trim().length === 0)) {
      errors.push('Banned by must be a non-empty string.');
    }

    if (errors.length > 0) {
      throw new AppError('Validation Failed', 501, {
        details: errors,
      })
    }

    // Assign `null` to missing fields to satisfy the stored procedure requirements
    const title = book.title || null;
    const author = book.author || null;
    const description = book.description || null;
    const ban_reason = book.ban_reason || null;
    const banned_by = book.banned_by || null;

    const result = await query("CALL sp_update_book(?, ?, ?, ?, ?, ?)", [
      id,
      title,
      author,
      description,
      ban_reason,
      banned_by,
    ]);

    let message = '';

    const affectedRows = (result[0] as mysql.ResultSetHeader).affectedRows || 0;

    if (affectedRows) {
      message = `Book with id: ${id} updated successfully`;
      return { message };
    } else {
      throw new AppError(`Error updating book with id: ${id}`, 501, {
        details: 'Query failed to update an existing book'
      });
    }
  } catch (err: any) {
    console.error("Error in update:", err);
    throw err;
  }
}

//remove an existing book by id
export async function remove(id: Number) {
  try {
    const result = await query("CALL sp_delete_book(?)", [id]);

    let message = '';

    const affectedRows = (result[0] as mysql.ResultSetHeader).affectedRows || 0;

    if (affectedRows) {
      message = `Book with id: ${id} deleted successfully`;
      return { message };
    } else {
      throw new AppError(`Error deleting book with id: ${id}`, 501);
    }

  } catch (err: any) {
    console.error("Error in remove:", err);
    throw err;
  }
}
