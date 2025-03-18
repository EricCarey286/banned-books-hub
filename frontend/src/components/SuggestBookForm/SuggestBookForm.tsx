import React, { useState } from "react";

const URL_PREFIX = import.meta.env.VITE_URL_PREFIX;
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
    const newErrors: string[] = [];

    if (formData.isbn && !/^\d{10}$/.test(formData.isbn)) {
      newErrors.push("ISBN must be a valid 10-digit number & unique");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      try {
        const response = await fetch(`${URL_PREFIX}://${apiUrl}/suggested_books`, {
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
    <div className="max-w-2xl mx-auto bg-white shadow-md rounded-lg p-6 border border-gray-200 mt-10">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title - Full Width */}
        <h2 className="text-2xl font-semibold text-gray-800 text-center">Suggest a Banned Book</h2>

        {/* Title - Full Width */}
        <div className="flex flex-col">
          <label htmlFor="title" className="text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            name="title"
            id="title"
            value={formData.title}
            onChange={handleChange}
            className="mt-1 p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-300"
          />
        </div>

        {/* ISBN & Author - Side by Side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label htmlFor="isbn" className="text-sm font-medium text-gray-700">ISBN</label>
            <input
              type="text"
              name="isbn"
              id="isbn"
              value={formData.isbn}
              onChange={handleChange}
              className="mt-1 p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-300"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="author" className="text-sm font-medium text-gray-700">Author</label>
            <input
              type="text"
              name="author"
              id="author"
              value={formData.author}
              onChange={handleChange}
              className="mt-1 p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-300"
            />
          </div>
        </div>

        {/* Description - Full Width */}
        <div className="flex flex-col">
          <label htmlFor="description" className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            id="description"
            value={formData.description}
            onChange={handleChange}
            className="mt-1 p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-300"
          ></textarea>
        </div>

        {/* Ban Reason & Banned By - Side by Side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label htmlFor="banned_by" className="text-sm font-medium text-gray-700">Banned By</label>
            <input
              type="text"
              name="banned_by"
              id="banned_by"
              value={formData.banned_by}
              onChange={handleChange}
              className="mt-1 p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-300"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="ban_reason" className="text-sm font-medium text-gray-700">Ban Reason</label>
            <input
              type="text"
              name="ban_reason"
              id="ban_reason"
              value={formData.ban_reason}
              onChange={handleChange}
              className="mt-1 p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-300"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition">
          Submit
        </button>
      </form>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="mt-4 p-4 bg-gray-700 border border-gray-300 rounded-md">
          <strong className="block text-red-700 font-semibold">The following errors occurred:</strong>
          <ul className="list-none pl-0">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mt-4 p-4 bg-green-100 text-green-700 border border-green-300 rounded-md">
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default SuggestBookForm;