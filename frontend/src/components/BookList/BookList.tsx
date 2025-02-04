import { useEffect, useState } from "react";
import Table from "../generic/Table/Table";
import PageButton from "../generic/Button/PageButton";

import './BookList.css'

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
    const [pageNumber, setPageNumber] = useState<number>(1);

    // Fetch data from the backend
    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const response = await fetch(`https://localhost:3000/books?page=${pageNumber}`);
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
    }, [pageNumber]);

    function nextPage(action: string) {
        let nextPage = 0;
        try {
            if (action == 'next') {
                nextPage = pageNumber + 1;
                setPageNumber(nextPage);
            } else if (action == 'prev') {
                if (nextPage == 1) {
                    return;
                } else {
                    nextPage = pageNumber - 1;
                    setPageNumber(nextPage);
                }
            }
        } catch (err) {
            setMyError(`An unexpected error occurred: ${err}. Please try again later.`);
        }
    }

    return (
        <>
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
            <div className='book-container'>
                <PageButton onClick={() => nextPage('prev')} action='prev' disabled={pageNumber == 1 ? true : false} currentPage={pageNumber}/>
                <PageButton onClick={() => nextPage('next')} action='next' currentPage={pageNumber}/>
            </div>
        </>
    );
};