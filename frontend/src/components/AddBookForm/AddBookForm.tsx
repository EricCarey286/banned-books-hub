import React, { useState } from "react";
import "./AddBookForm.css"; // Import the CSS file

interface BookFormProps {
  apiUrl: string; // The base URL of your backend API
}

const AddBookForm: React.FC<BookFormProps> = ({ apiUrl }) => {
  const [formData, setFormData] = useState({
    isbn: "",
    title: "",
    author: "",
    description: "",
    ban_reason: "",
    banned_by: "",
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: string[] = [];

    Object.entries(formData).forEach(([key, value]) => {
      if (!value.trim()) {
        newErrors.push(`${key.replace("_", " ")} is required`);
      }
    });

    if (formData.isbn && !/^\d{10}$/.test(formData.isbn)) {
      newErrors.push("ISBN must be a valid 10-digit number");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      try {
        const response = await fetch(`${apiUrl}/books`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify([formData]),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setErrors([errorData.message || "Failed to update book."]);
        } else {
          setSuccessMessage(`Book "${formData.title}" has been successfully updated.`);
          setFormData({
            isbn: "",
            title: "",
            author: "",
            description: "",
            ban_reason: "",
            banned_by: "",
          });
          setErrors([]);
        }
      } catch (err) {
        setErrors([`An unexpected error occurred: ${err}. Please try again later.`]);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit} className="book-form">
        <h2 className="form-title">Add a Book</h2>

        <div className="form-group">
          <label htmlFor="isbn">ISBN:</label>
          <input
            type="text"
            name="isbn"
            id="isbn"
            value={formData.isbn}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="title">Title:</label>
          <input
            type="text"
            name="title"
            id="title"
            value={formData.title}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="author">Author:</label>
          <input
            type="text"
            name="author"
            id="author"
            value={formData.author}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <textarea
            name="description"
            id="description"
            value={formData.description}
            onChange={handleChange}
          ></textarea>
        </div>

        <div className="form-group">
          <label htmlFor="ban_reason">Ban Reason:</label>
          <input
            type="text"
            name="ban_reason"
            id="ban_reason"
            value={formData.ban_reason}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="banned_by">Banned By:</label>
          <input
            type="text"
            name="banned_by"
            id="banned_by"
            value={formData.banned_by}
            onChange={handleChange}
          />
        </div>

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

export default AddBookForm;