import mysql from 'mysql2/promise'; 
import query from "./db";
import { getOffset, emptyOrRows } from "../utils/helper";
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
export async function getMultiple(page = 1) {
  try {
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
export async function getBook(term: string) {
  try {
    const regex = "%" + term + "%";
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
  try {
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
   if (!book.title && !book.author && !book.description) {
    throw new Error("At least one field (title, author, or description) must be provided to update.");
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

    let message = `Error in updating book with id: ${id}`;

    const affectedRows = (result[0] as mysql.ResultSetHeader).affectedRows || 0;

    if (affectedRows) {
      message = `Book with id: ${id} updated successfully`;
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
