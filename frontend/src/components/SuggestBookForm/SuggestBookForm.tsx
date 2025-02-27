import React, { useState } from "react";
import "./SuggestBookForm.css"; // Import the CSS file

interface BookFormProps {
  apiUrl: string; // The base URL of your backend API
}

const SuggestBookForm: React.FC<BookFormProps> = ({ apiUrl }) => {
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
    console.log('validating..');
    const newErrors: string[] = [];
    // if(formData.action !== "update" && formData.action !== "delete"){
    //   Object.entries(formData).forEach(([key, value]) => {
    //     if (!value.trim()) {
    //       newErrors.push(`${key.replace("_", " ")} is required`);
    //     }
    //   });
    // }
  
    if (formData.isbn && !/^\d{10}$/.test(formData.isbn)) {
      newErrors.push("ISBN must be a valid 10-digit number & unique");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('submitted')

    if (validateForm()) {
      console.log('validated')
      try {
        //let response;
        // switch (formData.action) {
        //   case "add":
        const response = await fetch(`https://${apiUrl}/suggested_books`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify([formData]),
        });
            // break;
          // case "delete":
          //   response = await fetch(`https://localhost:3000/sugessted_books/${formData.isbn}`, {
          //     method: "DELETE",
          //   });
          //   break;
          // case "update":
          //   response = await fetch(`https://localhost:3000/sugessted_books/${formData.isbn}`, {
          //     method: "PUT",
          //     headers: {
          //       "Content-Type": "application/json",
          //     },
          //     body: JSON.stringify(formData),
          //   });
          //  break;
        //   default:
        //     setErrors(["Invalid action."]);
        //     return;
        // }

        if (!response.ok) {
          console.log('error')
          const errorData = await response.json();
          setErrors([errorData.message || "Failed to create suggested book."]);
        } else {
          setSuccessMessage(`Book "${formData.title}" has been successfully suggested. We will review this submission and update the database accordingly`);
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
        <h2 className="form-title">Suggest a banned book to add</h2>
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
          <>
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

export default SuggestBookForm;