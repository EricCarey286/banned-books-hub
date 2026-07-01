import mysql from 'mysql2/promise';
import query from "./db";
import { getOffset, emptyOrRows, AppError } from "../utils/helper";
import { DB_CONFIG } from "../utils/config";

interface Form {
  name: string;
  email: string;
  message: string;
}

export async function getMultiple(page: number = 1) {
  const limit = DB_CONFIG.listPerPage;
  try {
    if (isNaN(page) || page <= 0) {
      throw new AppError("Invalid 'page' parameter. It must be a positive integer.", 400);
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

    const hasNextPage = data[0].length > limit;

    return {
      data: forms,
      meta: { page, hasNextPage },
    };
  } catch (err: any) {
    console.error("Error in getMultiple forms:", err);
    throw err;
  }
}

export async function getForm(searchTerm: string) {
  try {
    if (typeof searchTerm !== "string" || searchTerm.trim() === "") {
      throw new AppError("Invalid searchTerm parameter. It must be a non-empty string.", 400);
    }

    const regex = "%" + searchTerm + "%";
    const rows = await query(`CALL sp_search_forms_by_param(?)`, [regex]);
    const data = emptyOrRows(rows);
    return { data };
  } catch (err: any) {
    console.error("Error in getForm:", err);
    throw err;
  }
}

export async function create(form: Form) {
  let invalidFields: string[] = [];

  try {
    if (!form.name || typeof form.name !== "string" || form.name.trim().length === 0) {
      invalidFields.push('name');
    }
    if (!form.email || typeof form.email !== "string" || form.email.trim().length === 0) {
      invalidFields.push('email');
    }
    if (form.message !== undefined && typeof form.message !== "string") {
      invalidFields.push('message');
    }

    if (invalidFields.length > 0) {
      throw new AppError("Validation failed", 400, {
        details: "Required fields are missing or of invalid format.",
        invalidFields,
      });
    }

    const result = await query("CALL sp_insert_contactForm(?, ?, ?)", [
      form.name,
      form.email,
      form.message,
    ]);

    const affectedRows = (result[0] as mysql.ResultSetHeader).affectedRows || 0;

    if (affectedRows) {
      return { message: 'New form created successfully' };
    } else {
      throw new AppError("Creation failed", 500, {
        details: 'Form failed to create in database',
      });
    }
  } catch (err: any) {
    console.error("Error in create:", err);
    throw err;
  }
}
