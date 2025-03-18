import React, { useState } from "react";
import "./ContactForm.css"; // Import the CSS file

const URL_PREFIX = import.meta.env.VITE_URL_PREFIX;

interface ContactFormProps {
  apiUrl: string; // The base URL of your backend API
}

const ContactForm: React.FC<ContactFormProps> = ({ apiUrl }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: string[] = [];

    if (formData.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      newErrors.push("Email must be a valid email format: name@example.com");
    }
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      try {
        const response = await fetch(`${URL_PREFIX}://${apiUrl}/contact_form`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify([formData]),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.log(errorData.message)
          setErrors(["Failed to create suggested book."]);
        } else {
          setSuccessMessage('Your message has been submitted. We will respond as soon as possible');
          setFormData({
            name: "",
            email: "",
            message: "",
          });
          setErrors([]);
        }
      } catch (err) {
        setErrors([`An unexpected error occurred: ${err}. Please try again later.`]);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit} className="book-form">
        <h2 className="form-title">Contact Us</h2>
        <div className="form-group">
              <label htmlFor="name">Name:</label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
          <>
            <div className="form-group">
              <label htmlFor="email">Email:</label>
              <input
                type="text"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="message">Message:</label>
              <textarea
                name="message"
                id="message"
                value={formData.message}
                onChange={handleChange}
              ></textarea>
            </div>
          </>
        <button type="submit" className="submit-button">Submit</button>
      </form>

      {errors.length > 0 && (
        <div className="error-messages">
          <strong>The following errors occurred:</strong>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default ContactForm;