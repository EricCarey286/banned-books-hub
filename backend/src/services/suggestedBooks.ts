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
/**
 * Fetches multiple books based on the given page number.
 *
 * This function retrieves a list of suggested books from the database using a stored procedure.
 * It calculates the offset based on the page and limit, executes the query, and processes the results.
 * If the 'page' parameter is invalid, it throws an AppError. The function returns an object containing
 * the list of books and metadata about pagination.
 *
 * @param {number} [page=1] - The page number for which to fetch books. Must be a positive integer.
 */
export async function getMultiple(page: number = 1) {
  const limit = DB_CONFIG.listPerPage;
    try {
      if (isNaN(page) || page <= 0) {
        throw new AppError("Invalid 'page' parameter. It must be a positive integer.", 501);
      }
  
      const offset = getOffset(page, limit);
      const rows = await query("CALL sp_get_suggested_books(?, ?)", [
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
/**
 * Searches for books using a given search term.
 *
 * This function first validates that the provided search term is a non-empty string.
 * It then constructs a regex pattern from the search term and calls a stored procedure
 * to fetch matching book suggestions. The results are processed to ensure they are not empty,
 * and an object containing the data is returned. If any errors occur during this process,
 * they are logged and rethrown.
 *
 * @param searchTerm - The string used to search for books. It must be a non-empty string.
 */
export async function getBook(searchTerm: string) {
  try {
    if (typeof searchTerm !== "string" || searchTerm.trim() === "") {
      throw new AppError("Invalid searchTerm parameter. It must be a non-empty string.", 501);
    }

    const regex = "%" + searchTerm + "%";
    const rows = await query(`CALL sp_search_sugg_books_by_param(?)`, [regex]);
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
/**
 * Suggests a new book by inserting it into the database.
 *
 * This function validates the input book object and checks if required fields are present and correctly formatted.
 * If validation fails, it throws an AppError with details of missing or invalid fields.
 * It then attempts to insert the book into the database using a stored procedure.
 * If the insertion is successful, it returns a success message; otherwise, it throws an error indicating failure.
 *
 * @param book - An object containing book details such as title, author, isbn, description, ban_reason, and banned_by.
 * @returns An object with a message indicating the success or failure of the operation.
 * @throws AppError If validation fails or if there is an issue inserting the book into the database.
 */
export async function suggest(book: Book) {
  let invalidFields: any = [];

  try {
    if (!book.title || typeof book.title !== "string" || book.title.trim().length === 0) {
      invalidFields.push('title')
    }
    if (!book.author || typeof book.author !== "string" || book.author.trim().length === 0) {
      invalidFields.push('author');
    }
    if (!book.banned_by && typeof book.banned_by !== "string" || book.banned_by.trim().length === 0) {
      invalidFields.push('banned_by');
    }

    if (invalidFields.length > 0) {
      throw new AppError("Validation failed", 501, {
        details: "Required fields are missing or of invalid format.",
        invalidFields: invalidFields,
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

    let message = "Error in creating suggetsed book entry";

    const affectedRows = (result[0] as mysql.ResultSetHeader).affectedRows || 0;

    if (affectedRows) {
      message = `New suggested book: ${book.title} created successfully`;
    } else {
      throw new AppError("Creation of suggested book failed", 501,{
        details: 'Suggested book failed to create in database',
      });
    }

    return { message };
  } catch (err: any) {
    console.error("Error in suggested:", err);
    throw err;
  }
}

//remove an existing suggested book by id
/**
 * Removes a book by its ID using a stored procedure.
 *
 * This function calls a MySQL stored procedure to delete a book record based on the provided ID.
 * It checks the number of affected rows and returns a success message if the deletion is successful.
 * If no rows are affected, it throws an error. Any errors during the execution are caught and rethrown.
 *
 * @param id - The numeric ID of the book to be deleted.
 * @returns An object containing a success message if the book is successfully deleted.
 * @throws AppError If the deletion fails or no rows are affected.
 */
export async function remove(id: Number) {
  try {
    const result = await query("CALL sp_delete_sugg_book(?)", [id]);

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

//remove multiple suggested books by id
/**
 * Deletes multiple books by their IDs using a stored procedure.
 * Validates that the input is a non-empty array, converts the array to a comma-separated string,
 * and executes the SQL IN clause within the stored procedure.
 *
 * @param ids - An array of book IDs to be deleted.
 */
export async function removeMultiple(ids: number[]) {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError("Invalid input: 'ids' must be a non-empty array", 400);
    }

    // Convert array to a comma-separated string WITHOUT quotes (for SQL IN clause)
    const idString = ids.join(",");

    // Call the stored procedure
    const result = await query("CALL sp_delete_sugg_books(?)", [idString]);

    return {
      message: `Books with IDs: ${ids.join(", ")} deleted successfully`
    };

  } catch (err: any) {
    console.error("Error in removeMultiple:", err);
    throw err;
  }
}