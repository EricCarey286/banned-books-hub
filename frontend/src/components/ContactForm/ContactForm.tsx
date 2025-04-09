import React from "react";
import Form from "../generic/Form/Form";

const URL_PREFIX = import.meta.env.VITE_URL_PREFIX;

interface ContactFormProps {
  apiUrl: string;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const ContactForm: React.FC<ContactFormProps> = ({ apiUrl, authFetch }) => {
  const fields = [
    {
      name: "name",
      label: "Name",
      type: "text",
    },
    {
      name: "email",
      label: "Email",
      type: "text",
    },
    {
      name: "message",
      label: "Message",
      type: "textarea",
    },
  ];

  const initialValues = {
    name: "",
    email: "",
    message: "",
  };

  const validateForm = (values: Record<string, string>) => {
    const errors: string[] = [];

    if (!values.name.trim()) {
      errors.push("Name is required");
    }

    if (!values.email.trim()) {
      errors.push("Email is required");
    }

    if (!values.message.trim()) {
      errors.push("A message is required");
    }

    if (values.email && !/\S+@\S+\.\S+/.test(values.email)) {
      errors.push("Email must be a valid email address. (ex. example@email.com).");
    }

    return errors;
  };

  const handleSubmit = async (values: Record<string, string>) => {
    let response;
    try{
      response = await authFetch(`${URL_PREFIX}://${apiUrl}/contact_form`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([values]),
      });
    } catch(err){
        throw new Error("Invalid action. " + err);
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update book.");
    }
  };

  return <Form title="Add a new Book" fields={fields} initialValues={initialValues} validate={validateForm} onSubmit={handleSubmit} />;
};

export default ContactForm;