import React, { useState } from "react";
import Form from "../generic/Form/Form";
import TurnstileWidget from "../generic/Turnstile/TurnstileWidget";

const URL_PREFIX = import.meta.env.VITE_URL_PREFIX;

interface ContactFormProps {
  apiUrl: string;
}

/**
 * A React component representing a contact form.
 *
 * This component renders a form with fields for name, email, and message.
 * It validates the input fields to ensure they are filled out correctly,
 * including validating the email format. Submission requires a human-verification
 * token, which is sent with the request and then discarded.
 *
 * @param apiUrl - The base URL of the API where the form data will be sent.
 * @returns A JSX element representing the contact form.
 */
const ContactForm: React.FC<ContactFormProps> = ({ apiUrl }) => {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [widgetKey, setWidgetKey] = useState(0);

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
   * Handles form submission by sending one entry to the server with a verification token.
   * Each attempt uses a fresh token, so the widget is reset afterwards.
   *
   * @param values - An object containing key-value pairs of form field names and their respective values.
   */
  const handleSubmit = async (values: Record<string, string>) => {
    try {
      const response = await fetch(`${URL_PREFIX}://${apiUrl}/contact_form`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Turnstile-Token": turnstileToken ?? "",
        },
        body: JSON.stringify([values]),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send message.");
      }
    } finally {
      setTurnstileToken(null);
      setWidgetKey((key) => key + 1);
    }
  };

  return (
    <Form
      title="Contact Us"
      fields={fields}
      initialValues={initialValues}
      validate={validateForm}
      onSubmit={handleSubmit}
      submitDisabled={!turnstileToken}
      footer={<TurnstileWidget key={widgetKey} onToken={setTurnstileToken} />}
    />
  );
};

export default ContactForm;
