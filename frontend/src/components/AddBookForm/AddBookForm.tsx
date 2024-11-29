import React, { useState } from "react";
import './AddBookForm.css';

interface BookFormProps {
  onSubmit: (book: {
    isbn: string;
    title: string;
    author: string;
    description: string;
    ban_reason: string;
    banned_by: string;
  }) => void;
}

const AddBookForm: React.FC<BookFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    isbn: "",
    title: "",
    author: "",
    description: "",
    ban_reason: "",
    banned_by: "",
  });

  const [errors, setErrors] = useState<string[]>([]);

  const validateForm = () => {
    const newErrors: string[] = [];

    // Check for empty fields
    Object.entries(formData).forEach(([key, value]) => {
      if (!value.trim()) {
        newErrors.push(`${key.replace("_", " ")} is required`);
      }
    });

    // Validate ISBN
    if (formData.isbn && !/^\d{10}$/.test(formData.isbn)) {
      newErrors.push("ISBN must be a valid 10-digit number");
    }

    setErrors(newErrors);
    return newErrors.length === 0; // Return true if no errors
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
      setFormData({
        isbn: "",
        title: "",
        author: "",
        description: "",
        ban_reason: "",
        banned_by: "",
      });
      setErrors([]); // Clear errors after successful submission
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
        <h2 className="form-title">Add a New Book</h2>
        <div className="form-group">
          <label>ISBN:</label>
          <input
            type="text"
            name="isbn"
            value={formData.isbn}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Title:</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Author:</label>
          <input
            type="text"
            name="author"
            value={formData.author}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Description:</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Ban Reason:</label>
          <input
            type="text"
            name="ban_reason"
            value={formData.ban_reason}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Banned By:</label>
          <input
            type="text"
            name="banned_by"
            value={formData.banned_by}
            onChange={handleChange}
          />
        </div>
        <button type="submit" className="submit-button">Submit</button>
      </form>

      {/* Error Messages */}
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
    </div>
  );
};

export default AddBookForm;