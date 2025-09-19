import { FC } from "react";
import Form from "../generic/Form/Form";

const URL_PREFIX = import.meta.env.VITE_URL_PREFIX;

type ImgFormProps = {
    apiUrl: string;
};

const AddImageForm: FC<ImgFormProps> = ({ apiUrl }: ImgFormProps) => {
  const fields = [
    {
      name: "isbn",
      label: "ISBN",
      type: "text",
    },
    {
      name: "image",
      label: "Book Cover",
      type: "file",
    }
  ];

  const initialValues = {
    isbn: ""
  };

  const validateForm = (values: Record<string, string>) => {
    const errors: string[] = [];

    if (values.isbn && !/^(?:\d{10}|\d{13})$/.test(values.isbn)) {
      errors.push("ISBN must be a valid 10 or 13 digit number.");
    }

    return errors;
  };

  const uploadImage = async (file: File, isbn: string): Promise<{ message: string; fileName: string }> => {
    console.log('uploading image: ' + file);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("isbn", isbn);

    const res = await fetch(`${URL_PREFIX}://${apiUrl}/book-image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");

    return res.json(); // { message, fileName }
  }

  const handleSubmit = async (values: Record<string, string>, file?: File | null) => {
    try {
      if (file) {
        const { fileName } = await uploadImage(file, values.isbn);
        console.log(fileName);
      } else {
        console.log('No file attached');
      }
    } catch (err) {
      console.log(err);
    }
  };

  return <Form
    title="Upload Image To Minio"
    fields={fields}
    initialValues={initialValues}
    validate={validateForm}
    onSubmit={handleSubmit}
  />;
};

export default AddImageForm;