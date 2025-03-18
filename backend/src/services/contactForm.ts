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

    const forms = data[0].slice(0, limit); // Keep only 10 forms
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
      throw new AppError("Creation failed", 501,{
        details: 'Form failed to create in database',
      });
    }

    return { message };
  } catch (err: any) {
    console.error("Error in create:", err);
    throw err;
  }
}