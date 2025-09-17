import { useEffect, useState } from "react";
import PageButton from "../generic/Button/PageButton";
import BookCard from "../generic/Card/BookCard";

const URL_PREFIX = import.meta.env.VITE_URL_PREFIX;
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
    cover_url: string;
    [key: string]: string | number | null; // Index signature for dynamic access
}
interface BookListProps {
    apiUrl: string;
}

/**
 * React component that fetches and displays a list of books from an API.
 *
 * It manages the state of books, loading status, pagination, and error handling.
 * The component fetches books data using a provided API URL and page number,
 * updates the UI based on the fetched data, and handles navigation between pages.
 *
 * @param apiUrl - The base URL for the API endpoint to fetch books.
 */
const BooksList: React.FC<BookListProps> = ({ apiUrl }) => {

    const [books, setBooks] = useState<Book[]>([]);
    const [myError, setMyError] = useState<string | null>(null);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);
    const [hasNextPage, setHasNextPage] = useState(true);


    // Fetch data from the backend
    useEffect(() => {
        /**
         * Fetches books from an API and updates state with fetched data.
         *
         * This function makes an asynchronous request to fetch books based on the provided page number.
         * It handles successful responses by updating the `books` and `hasNextPage` states.
         * In case of an error, it logs the error message and sets a generic error message in the state.
         * Finally, it ensures that the loading state is set to false.
         */
        const fetchBooks = async () => {
            try {
                const response = await fetch(`${URL_PREFIX}://${apiUrl}/books?page=${pageNumber}`);
                if (!response.ok) {
                    console.log('Fetch Books Error');
                    throw new Error(`Error: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                setBooks(data.data);
                setHasNextPage(data.meta.hasNextPage);
            } catch (err: unknown) {
                if (err instanceof Error) {
                    console.log(`Error on /books fetch: ${err.message}`);
                    setMyError('We are having trouble loading the latest books, please try again later!');
                } else {
                    setMyError("We are having trouble loading the latest books, please try again later!");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, [pageNumber, apiUrl]);

    /**
     * Handles navigation to the next or previous page based on the given action.
     *
     * This function updates the page number by incrementing or decrementing it
     * depending on whether the 'next' or 'prev' action is provided. It includes
     * error handling to manage unexpected issues gracefully, logging errors and setting
     * an error message for the user.
     */
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
            console.log(`Error on nextPage action: ${err}`)
            setMyError('That wasn\'t supposed to happen. Please refresh or try again later.');
        }
    }

    return (
        <>
            <div className="m-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Banned Books</h3>
                {myError ? (
                    <p className="text-yellow-500 text-center">{myError}</p>
                ) : loading ? (
                    <p>Please wait while we gather the latest books...</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-5 p-2">
                        {(() => {
                            const excludedKeys: (keyof Book)[] = [
                                "title",
                                "author",
                                "isbn",
                                "description",
                                "ban_reason",
                                "banned_by",
                            ];
                            return books.map((item) => (
                                <BookCard
                                    key={`bookList-${item.id}`}
                                    data={item}
                                    renderFields={(key: keyof Book, value: Book[keyof Book]) =>
                                        !excludedKeys.includes(key) ? (
                                            <p key={key} className="text-gray-500 text-xs">
                                                {key}: {String(value)}
                                            </p>
                                        ) : null
                                    }
                                />
                            ));
                        })()}
                    </div>
                )}
            </div>
            <div className='flex justify-between items-center'>
                <PageButton onClick={() => nextPage('prev')} action='prev' disabled={pageNumber === 1} currentPage={pageNumber} />
                <PageButton onClick={() => nextPage('next')} action='next' disabled={!hasNextPage} currentPage={pageNumber} />
            </div>
        </>
    );
};

export default BooksList; 