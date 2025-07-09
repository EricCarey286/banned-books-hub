import React, { useState } from "react";
import Card from "./Card";
import Modal from "../Button/Modal";

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

/**
 * Renders a book card component that displays book information and can open a modal with detailed data.
 *
 * This component uses the `Card` and `Modal` components to display book details. It includes conditional rendering based on the presence of certain properties in the `data` object. The card is clickable, opening a modal with more detailed information about the book when clicked. The modal can be closed by clicking an 'X' button.
 *
 * @param data - The book data to be displayed.
 * @param renderFields - A function that renders additional fields for the card.
 */
const BookCard = <T extends Book>({ data, renderFields }: BookCardProps<T>) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    /**
     * Handles card click by logging a message and opening a modal.
     */
    const handleCardClick = () => {
        console.log('here')
        setIsModalOpen(true);
    };

    /**
     * Closes the modal by setting `isModalOpen` to false.
     */
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