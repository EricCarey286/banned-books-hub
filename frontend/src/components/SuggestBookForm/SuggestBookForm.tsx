import React from "react";
import Form from "../generic/Form/Form";

const URL_PREFIX = import.meta.env.VITE_URL_PREFIX;

const SuggestBookForm: React.FC<{ apiUrl: string }> = ({ apiUrl }) => {
  const fields = [
    { name: "title", label: "Title", type: "text" },
    { name: "isbn", label: "ISBN", type: "text" },
    { name: "author", label: "Author", type: "text" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "banned_by", label: "Banned By", type: "text" },
    { name: "ban_reason", label: "Ban Reason", type: "text" },
  ];

  const initialValues = {
    isbn: "",
    title: "",
    author: "",
    description: "",
    ban_reason: "",
    banned_by: "",
  };

  const validateForm = (values: Record<string, string>) => {
    const errors: string[] = [];
    if (values.isbn && !/^\d{10}$/.test(values.isbn)) {
      errors.push("ISBN must be a valid 10-digit number.");
    }
    return errors;
  };

  const handleSubmit = async (values: Record<string, string>) => {
    const response = await fetch(`${URL_PREFIX}://${apiUrl}/suggested_books`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([values]),
    });

    if (!response.ok) {
      throw new Error("Failed to create suggested book.");
    }
  };

  return <Form title="Suggest a Banned Book" fields={fields} initialValues={initialValues} validate={validateForm} onSubmit={handleSubmit} />;
};

export default SuggestBookForm;