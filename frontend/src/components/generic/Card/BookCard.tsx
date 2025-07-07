import React, { useState } from "react";
import Card from "./Card";
import Modal from "../Button/Modal";
import reactImg from "/Users/ericwork/banned-books-app/banned-books-hub/frontend/src/assets/react.svg";

interface Book {
    id: number;
    isbn: string;
    title: string;
    author: string;
    description: string;
    ban_reason: string | null;
    banned_by: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: string | number | null; // Index signature for dynamic access
}

// Define the type for the BookCard component's props
type BookCardProps<T extends Book> = {
    data: T;
    renderFields?: (key: keyof T, value: T[keyof T]) => React.ReactNode;
};

const BookCard = <T extends Book>({ data, renderFields }: BookCardProps<T>) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleCardClick = () => {
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div>
            <Card
                data={data}
                renderFields={renderFields}
                clickable={true}
                onClick={(handleCardClick)}
                header={
                    <>
                        <img src={reactImg} className="mx-auto pb-2"></img>
                        {"title" in data && typeof data.title === "string" && (
                            <h2 className="text-gray-600 text-lg font-semibold">{data.title}</h2>
                        )}
                        {"author" in data && typeof data.author === "string" && (
                            <p className="text-gray-600 text-sm mb-4">Author: {data.author}</p>
                        )}
                        {"ban_reason" in data && (
                            <p className="text-gray-500 text-xs">
                                <span className="font-bold">Ban Reason:</span> {String(data.ban_reason)}
                            </p>
                        )}
                    </>
                }
            />

            <Modal isOpen={isModalOpen} onClose={closeModal} title={data.title}>
                <p className="text-gray-600 text-sm mb-4">Author: {data.author}</p>
                <p className="text-gray-600 text-xs mb-4"><span className="font-bold">ISBN: </span>{data.isbn}</p>
                <p className="text-gray-600 text-sm mb-4">{data.description}</p>
                <p className="text-gray-500 text-sm">
                    <span className="font-bold">Ban Reason:</span> {String(data.ban_reason)}
                </p>
                <p className="text-gray-500 text-sm">
                    <span className="font-bold">Banned By:</span> {String(data.banned_by)}
                </p>
            </Modal>
        </div>
    );
};

export default BookCard;