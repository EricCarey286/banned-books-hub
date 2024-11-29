import { useEffect, useState } from "react";
import Table from "../generic/Table/Table";

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

export default function BooksList() {
    const [books, setBooks] = useState<Book[]>([]);
    const [myError, setMyError] = useState<string | null>(null);

    // Fetch data from the backend
    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const response = await fetch("https://localhost:3000/books?page=1");
                if (!response.ok) {
                    throw new Error(`Error: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                setBooks(data.data[0]);
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setMyError(err.message);
                } else {
                    setMyError("An unknown error occurred.");
                }
            }
        };

        fetchBooks();
    }, []);

    return (
        <div>
            <h3>Banned Books</h3>
            {myError ? (
                <p style={{ color: "red" }}>Error: {myError}</p>
            ) : (
                <Table 
                    data={books} 
                    visibleColumns={['title', 'author', 'description', 'banned_by', 'ban_reason', 'isbn']} 
                    headers={{ 
                        title: "Titlle",
                        author: "Author",
                        description: "Description",
                        banned_by: "Banned By",
                        ban_reason: "Ban Reasoning",
                        isbn: "ISBN",
                    }} />
            )}
        </div>
    );
};