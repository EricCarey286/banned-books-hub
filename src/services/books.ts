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
  try {
    if (isNaN(page) || page <= 0) {
      throw new AppError("Invalid 'page' parameter. It must be a positive integer.", 501);
    }

    const offset = getOffset(page, DB_CONFIG.listPerPage);
    const rows = await query("CALL sp_get_books(?, ?)", [
      offset,
      DB_CONFIG.listPerPage,
    ]);
    const data = emptyOrRows(rows);
    const meta = { page };

    return {
      data,
      meta,
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

//create a book
export async function create(book: Book) {
  let invalidFields: any = [];
  let inputError = false;
  try {
    if (!book.isbn || typeof book.isbn !== "string" || book.isbn.trim().length === 0) {
      invalidFields.push('isbn');
      inputError = true;
    }
    if (!book.title || typeof book.title !== "string" || book.title.trim().length === 0) {
      invalidFields.push('title')
      inputError = true;
    }
    if (!book.author || typeof book.author !== "string" || book.author.trim().length === 0) {
      invalidFields.push('author');
      inputError = true;
    }
    if (!book.banned_by && typeof book.banned_by !== "string" || book.banned_by.trim().length === 0) {
      invalidFields.push('banned_by');
      inputError = true;
    }
    if (book.description !== undefined && typeof book.description !== "string") {
      invalidFields.push('description');
      inputError = true;
    }
    if (book.ban_reason !== undefined && typeof book.ban_reason !== "string") {
      invalidFields.push('ban_reason');
      inputError = true;
    }

    if(inputError){
      throw new AppError(`Invalid request. Missing or invalid input fields: ${invalidFields}`, 501);
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
    }

    return { message };
  } catch (err: any) {
    console.error("Error in create:", err);
    throw err;
  }
}

//update an existing book by id
export async function update(id: Number, book: Book) {
   // Validate the input: ensure at least one field is provided
   if (!book.title && !book.author && !book.description && !book.ban_reason && !book.banned_by) {
    throw new AppError("At least one field (title, author, or description) must be provided to update.", 501);
  }

  // Assign `null` to missing fields to satisfy the stored procedure requirements
  const title = book.title || null;
  const author = book.author || null;
  const description = book.description || null;
  const ban_reason = book.ban_reason || null;
  const banned_by = book.banned_by || null;

  try {
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
    } else {
      throw new AppError(`Error updating book with id: ${id}`, 501);
    }

    return { message };
  } catch (err: any) {
    console.error("Error in update:", err);
    throw err;
  }
}

//remove an existing book by id
export async function remove(id: Number) {
  try {
    const result = await query("CALL sp_delete_book(?)", [id]);

    let message = `Error in deleting book with id: ${id}`;

    const affectedRows = (result[0] as mysql.ResultSetHeader).affectedRows || 0;
  

    if (affectedRows) {
      message = `Book with id: ${id} deleted successfully`;
    }

    return { message };
  } catch (err: any) {
    console.error("Error in remove:", err);
    throw err;
  }
}
