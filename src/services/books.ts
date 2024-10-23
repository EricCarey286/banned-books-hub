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

    // if (result.affectedRows) {
    //   message = "New book entry created successfully";
    // }

    return { message };
  } catch (err: any) {
    console.error("Error in create:", err);
    throw err;
  }
}

export async function update(id: Number, book: Book) {
  try {
    const result = await query("CALL sp_update_book(?, ?, ?, ?)", [
      id,
      book.title,
      book.author,
      book.description,
    ]);

    let message = `Error in updating book with id: ${id}`;

    // if (result.affectedRows) {
    //   message = `Book with id: ${id} updated successfully`;
    // }

    return { message };
  } catch (err: any) {
    console.error("Error in update:", err);
    throw err;
  }
}

export async function remove(id: Number) {
  try {
    const result = await query("CALL sp_delete_book(?)", [id]);

    let message = `Error in deleting book with id: ${id}`;

    console.log("Result from stored procedure:", result);

    //const affectedRows = result[0]?.affectedRows || 0;
  

    // if (affectedRows) {
    //   message = `Book with id: ${id} deleted successfully`;
    // }

    return { message };
  } catch (err: any) {
    console.error("Error in remove:", err);
    throw err;
  }
}
