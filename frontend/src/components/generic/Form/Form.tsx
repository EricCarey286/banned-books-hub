import React, { useState } from "react";

interface FormProps {
  title: string;
  fields: { name: string; label: string; type: string; options?: { label: string; value: string }[] }[]; // Added 'options' for select fields
  initialValues: Record<string, string>;
  validate?: (values: Record<string, string>) => string[];
  onSubmit: (values: Record<string, string>) => Promise<void>;
}

const Form: React.FC<FormProps> = ({ title, fields, initialValues, validate, onSubmit }) => {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage(null);

    if (validate) {
      const validationErrors = validate(formData);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }
    }

    try {
      await onSubmit(formData);
      setSuccessMessage("Form submitted successfully!");
      setFormData(initialValues);
    } catch (err) {
      console.log(`Error in Form submit: ${err}`);
      setErrors(["An error occurred while submitting the form."]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white shadow-md rounded-lg p-6 border border-gray-200 mt-10">
      <h2 className="text-2xl font-semibold text-gray-800 text-center">{title}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map(({ name, label, type, options }) => (
          <div key={name} className="flex flex-col">
            <label htmlFor={name} className="text-sm font-medium text-gray-700">{label}</label>
            {type === "textarea" ? (
              <textarea
                name={name}
                id={name}
                value={formData[name]}
                onChange={handleChange}
                className="mt-1 p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-300"
              />
            ) : type === "select" ? (
              <select
                name={name}
                id={name}
                value={formData[name]}
                onChange={handleChange}
                className="mt-1 p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-300"
              >
                {options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={type}
                name={name}
                id={name}
                value={formData[name]}
                onChange={handleChange}
                className="mt-1 p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-300"
              />
            )}
          </div>
        ))}
        <button type="submit" className="w-full py-2 px-4 rounded-md transition">
          Submit
        </button>
      </form>

      {errors.length > 0 && (
        <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-md">
          <strong className="block text-red-700 font-semibold">Errors:</strong>
          <ul className="list-none pl-5">
            {errors.map((error, index) => (
              <li key={index} className="!text-gray-600">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {successMessage && (
        <div className="mt-4 p-4 bg-green-100 text-green-700 border border-green-300 rounded-md">
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default Form;
