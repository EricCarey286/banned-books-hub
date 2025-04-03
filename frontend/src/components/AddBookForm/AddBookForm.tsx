import React from "react";
import Form from "../generic/Form/Form";

const URL_PREFIX = import.meta.env.VITE_URL_PREFIX;

interface AddBookFormProps {
  apiUrl: string;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

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
    { name: "isbn", label: "ISBN", type: "text" },
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
  ];

  const initialValues = {
    action: "",
    isbn: "",
    title: "",
    author: "",
    description: "",
    ban_reason: "",
    banned_by: "",
  };

  const validateForm = (values: Record<string, string>) => {
    const errors: string[] = [];

    if (values.action !== "update" && values.action !== "delete") {
      Object.entries(values).forEach(([key, value]) => {
        if (!value.trim() && key !== "action") {
          errors.push(`${key.replace("_", " ")} is required`);
        }
      });
    }

    if (values.isbn && !/^\d{10}$/.test(values.isbn)) {
      errors.push("ISBN must be a valid 10-digit number.");
    }

    return errors;
  };

  const handleSubmit = async (values: Record<string, string>) => {
    let response;
    switch (values.action) {
      case "add":
        response = await authFetch(`${URL_PREFIX}://${apiUrl}/books`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify([values]),
        });
        break;
      case "delete":
        response = await fetch(`${URL_PREFIX}://${apiUrl}/books/${values.isbn}`, {
          method: "DELETE",
        });
        break;
      case "update":
        response = await fetch(`${URL_PREFIX}://${apiUrl}/books/${values.isbn}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });
        break;
      default:
        throw new Error("Invalid action.");
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update book.");
    }
  };

  return <Form title="Add a new Book" fields={fields} initialValues={initialValues} validate={validateForm} onSubmit={handleSubmit} />;
};

export default AddBookForm;