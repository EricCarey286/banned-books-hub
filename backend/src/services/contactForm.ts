import mysql from 'mysql2/promise';
import query from "./db";
import { getOffset, emptyOrRows, AppError } from "../utils/helper";
import { DB_CONFIG } from "../utils/config";

//Type Interface Library
interface Form {
  name: String;
  email: String;
  message: String;
}

//query multiple books per page
/**
 * Fetches a paginated list of contact forms from the database.
 *
 * This function retrieves a specified number of contact forms based on the given page number.
 * It calculates the offset and limit using the `getOffset` function and a predefined configuration.
 * The function calls a stored procedure to fetch the data, processes it to determine if there is
 * a next page, and returns the paginated results along with metadata.
 *
 * @param {number} [page=1] - The page number of the contact forms to retrieve. Must be a positive integer.
 */
export async function getMultiple(page: number = 1) {
  const limit = DB_CONFIG.listPerPage;
  try {
    if (isNaN(page) || page <= 0) {
      throw new AppError("Invalid 'page' parameter. It must be a positive integer.", 501);
    }

    const offset = getOffset(page, limit);
    const rows = await query("CALL sp_get_contactForms(?, ?)", [
      offset,
      limit + 1,
    ]);
    const data = emptyOrRows(rows);

    const forms = data[0].slice(0, limit).map((form: any) => {
      return {
        ...form,
        created_on: form.created_on ? new Date(form.created_on).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }) : null,
        updated_on: form.updated_on ? new Date(form.updated_on).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }) : null,
      };
    });

    const hasNextPage = data[0].length > limit; // If 11 forms, there is another page

    return {
      data: forms,
      meta: { page, hasNextPage },
    };
  } catch (err: any) {
    console.error("Error in getMultiple forms:", err);
    throw err;
  }
}

//get a single book based on search criteria
/**
 * Searches for forms based on a given search term.
 *
 * This function takes a search term as input, validates it to ensure it is a non-empty string,
 * and then constructs a regex pattern with the search term. It calls a stored procedure to fetch
 * matching forms and processes the result using `emptyOrRows`. The function returns an object
 * containing the processed data. If any errors occur during this process, they are caught,
 * logged, and rethrown.
 *
 * @param searchTerm - The string to search for forms. It must be a non-empty string.
 */
export async function getForm(searchTerm: string) {
  try {
    if (typeof searchTerm !== "string" || searchTerm.trim() === "") {
      throw new AppError("Invalid searchTerm parameter. It must be a non-empty string.", 501);
    }

    const regex = "%" + searchTerm + "%";
    const rows = await query(`CALL sp_search_forms_by_param(?)`, [regex]);
    const data = emptyOrRows(rows);
    return {
      data,
    };
  } catch (err: any) {
    console.error("Error in getForm:", err);
    throw err;
  }
}

//create a book
/**
 * Creates a new contact form entry in the database.
 *
 * This function validates the input form data, checks for required fields and their formats,
 * and then inserts the data into the database using a stored procedure.
 * If validation fails or the insertion fails, it throws an AppError with appropriate details.
 *
 * @param form - An object containing the form data to be created.
 * @returns An object with a message indicating the success or failure of the operation.
 * @throws AppError If required fields are missing, of invalid format, or if the database insertion fails.
 */
export async function create(form: Form) {
  let invalidFields: any = [];

  try {
    if (!form.name || typeof form.name !== "string" || form.name.trim().length === 0) {
      invalidFields.push('name');
    }
    if (!form.email || typeof form.email !== "string" || form.email.trim().length === 0) {
      invalidFields.push('email')
    }
    if (form.message !== undefined && typeof form.message !== "string") {
      invalidFields.push('message');
    }

    if (invalidFields.length > 0) {
      throw new AppError("Validation failed", 501, {
        details: "Required fields are missing or of invalid format.",
        invalidFields: invalidFields,
      });
    }

    const result = await query("CALL sp_insert_contactForm(?, ?, ?)", [
      form.name,
      form.email,
      form.message,
    ]);

    let message = "Error in creating form entry";

    const affectedRows = (result[0] as mysql.ResultSetHeader).affectedRows || 0;

    if (affectedRows) {
      message = `New form created successfully`;
    } else {
      throw new AppError("Creation failed", 501, {
        details: 'Form failed to create in database',
      });
    }

    return { message };
  } catch (err: any) {
    console.error("Error in create:", err);
    throw err;
  }
}