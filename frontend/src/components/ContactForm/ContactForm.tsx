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
    <div className="max-w-lg mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800 text-center">Contact Us</h2>

        <div>
          <label htmlFor="name" className="block font-semibold text-gray-700">Name:</label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="email" className="block font-semibold text-gray-700">Email:</label>
          <input
            type="email"
            name="email"
            id="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="message" className="block font-semibold text-gray-700">Message:</label>
          <textarea
            name="message"
            id="message"
            value={formData.message}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md p-2 h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition duration-300"
        >
          Submit
        </button>
      </form>

      {errors.length > 0 && (
        <div className="mt-4 p-4 bg-gray-100 border border-gray-300 rounded-md">
          <strong className="block text-red-600 font-semibold">The following errors occurred:</strong>
          <ul className="list-none pl-0 text-gray-800">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {successMessage && (
        <div className="mt-4 p-4 bg-green-100 border border-green-300 text-gray-800 rounded-md">
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default ContactForm;