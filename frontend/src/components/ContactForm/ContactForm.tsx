import React from "react";
import Form from "../generic/Form/Form";

const URL_PREFIX = import.meta.env.VITE_URL_PREFIX;

interface ContactFormProps {
  apiUrl: string;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

/**
 * A React component representing a contact form.
 *
 * This component renders a form with fields for name, email, and message.
 * It validates the input fields to ensure they are filled out correctly,
 * including validating the email format. Upon submission, it sends the form data
 * to the specified API endpoint using the provided `authFetch` function.
 *
 * @param apiUrl - The base URL of the API where the form data will be sent.
 * @param authFetch - A function used to perform authenticated HTTP requests.
 * @returns A JSX element representing the contact form.
 */
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

  /**
   * Validates form data by checking for required fields and proper email format.
   *
   * This function checks if the 'name', 'email', and 'message' fields are filled out
   * and ensures that the 'email' field contains a valid email address. It returns an
   * array of error messages if any validation fails.
   *
   * @param values - An object containing form field names as keys and their respective values.
   */
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

  /**
   * Handles form submission by sending data to the server via an HTTP POST request.
   * This function constructs a JSON payload from the input values and sends it to the specified endpoint.
   * It also handles potential errors during the fetch operation, including network issues and invalid responses.
   *
   * @param values - An object containing key-value pairs of form field names and their respective values.
   */
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

  return <Form title="Contact Us" fields={fields} initialValues={initialValues} validate={validateForm} onSubmit={handleSubmit} />;
};

export default ContactForm;