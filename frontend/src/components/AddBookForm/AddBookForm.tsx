import React from "react";
import Form from "../generic/Form/Form";

const URL_PREFIX = import.meta.env.VITE_URL_PREFIX;

interface AddBookFormProps {
  apiUrl: string;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

/**
 * React functional component to render an AddBookForm.
 *
 * This component manages a form with various fields that are conditionally displayed based on the selected action (add, update, delete).
 * It validates the input values and handles form submission by making appropriate API calls.
 *
 * @param apiUrl - The URL of the API endpoint for book operations.
 * @param authFetch - A function to fetch data with authentication.
 * @returns A React component that renders the AddBookForm.
 */
const AddBookForm: React.FC<AddBookFormProps> = ({ apiUrl, authFetch }) => {
  const fields = [
    {
      name: "action",
      label: "What do you want to do?",
      type: "select",
      options: [
        { value: "", label: "-- Select an Action --" },
        { value: "add", label: "Add" },
        { value: "update", label: "Update" },
        { value: "delete", label: "Delete" },
      ],
    },
    {
      name: "id",
      label: "ID",
      type: "text",
      conditional: (values: Record<string, string>) => values.action === "delete",
    },
    {
      name: "isbn",
      label: "ISBN",
      type: "text",
      conditional: (values: Record<string, string>) => values.action !== "delete",
    },
    {
      name: "title",
      label: "Title",
      type: "text",
      conditional: (values: Record<string, string>) => values.action !== "delete",
    },
    {
      name: "author",
      label: "Author",
      type: "text",
      conditional: (values: Record<string, string>) => values.action !== "delete",
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      conditional: (values: Record<string, string>) => values.action !== "delete",
    },
    {
      name: "ban_reason",
      label: "Ban Reason",
      type: "text",
      conditional: (values: Record<string, string>) => values.action !== "delete",
    },
    {
      name: "banned_by",
      label: "Banned By",
      type: "text",
      conditional: (values: Record<string, string>) => values.action !== "delete",
    },
    {
      name: "image",
      label: "Book Cover",
      type: "file",
      conditional: (values: Record<string, string>) => values.action !== "delete",
    }
  ];

  const initialValues = {
    action: "",
    id: "",
    isbn: "",
    title: "",
    author: "",
    description: "",
    ban_reason: "",
    banned_by: "",
  };

  /**
   * Validates form inputs based on specific rules and action types.
   *
   * The function checks for required fields, validates ISBN format,
   * and ensures that necessary fields are present for different actions.
   * It collects all validation errors in an array and returns it.
   */
  const validateForm = (values: Record<string, string>) => {
    const errors: string[] = [];

    if (values.action === "delete" && !values.id.trim()) {
      errors.push("ID is required for deletion.");
    }

    if (values.action !== "delete") {
      Object.entries(values).forEach(([key, value]) => {
        if (!value.trim() && key !== "action" && key !== "id") {
          errors.push(`${key.replace("_", " ")} is required`);
        }
      });
    }

    if (values.isbn && !/^(?:\d{10}|\d{13})$/.test(values.isbn)) {
      errors.push("ISBN must be a valid 10 or 13 digit number.");
    }

    return errors;
  };

  /**
   * Handles the submission of book-related actions by making HTTP requests to the server.
   *
   * Depending on the `action` value in the input `values`, it performs an HTTP POST, DELETE, or PUT request.
   * The function checks the response status and throws an error with the server's error message if the request fails.
   *
   * @param values - An object containing the action type and relevant data for the operation (e.g., book details).
   * @returns A promise that resolves when the HTTP request is successful.
   * @throws Error If the HTTP request fails or if the action is invalid.
   */
  const uploadImage = async (file: File, isbn: string): Promise<{ message: string; fileName: string }> => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("isbn", isbn);

    const res = await fetch("/book-image/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");

    return res.json(); // { message, fileName }
  }

  const handleSubmit = async (values: Record<string, string>, file?: File | null) => {
    let response;

    switch (values.action) {
      case "add":
        if (file && values.isbn) {
          await uploadImage(file, values.isbn);
        }
        response = await authFetch(`${URL_PREFIX}://${apiUrl}/books`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify([values]),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to add book.");
        }
        break;
      case "delete":
        response = await fetch(`${URL_PREFIX}://${apiUrl}/books/${values.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.log(errorData)
          throw new Error(errorData.message || "Failed to delete book.");
        }
        break;
      case "update":
        response = await fetch(`${URL_PREFIX}://${apiUrl}/books/${values.isbn}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update book.");
        }
        break;
      default:
        throw new Error("Invalid action.");
    }
  };

  return <Form
    title="Add a new Book"
    fields={fields}
    initialValues={initialValues}
    validate={validateForm}
    onSubmit={handleSubmit}
  />;
};

export default AddBookForm;