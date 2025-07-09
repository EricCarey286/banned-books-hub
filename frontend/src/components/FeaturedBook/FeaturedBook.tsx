import { useEffect, useState } from "react";
import FeaturedCard from "../generic/Card/FeaturedCard";

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
    [key: string]: string | number | null; // Index signature for dynamic access
}
interface BookListProps {
    apiUrl: string; // The base URL of the backend API
}

/**
 * React component to display a featured book from the backend API.
 *
 * This component fetches featured books data from the provided API URL and displays it.
 * It handles loading states and errors, displaying appropriate messages if the fetch fails or is still in progress.
 * The component uses a functional component with hooks for state management and side effects.
 *
 * @param apiUrl - The API endpoint to fetch featured books.
 * @returns JSX representing the featured book list or an error message.
 */
const FeaturedBook: React.FC<BookListProps> = ({ apiUrl }) => {

    const [books, setBooks] = useState<Book[]>([]);
    const [myError, setMyError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);


    // Fetch data from the backend
    useEffect(() => {
        /**
         * Fetches featured books from the API and updates the state with the first book's data.
         *
         * This function makes an asynchronous GET request to the featured books endpoint.
         * It handles successful responses by updating the `books` state with the first book's data.
         * In case of an error, it logs the error message and updates the `myError` state with a user-friendly error message.
         * The loading state is set to false in both success and failure scenarios.
         */
        const fetchBooks = async () => {
            try {
                const response = await fetch(`${URL_PREFIX}://${apiUrl}/books/featured`);
                if (!response.ok) {
                    console.log('Fetch Featured Error');
                    throw new Error(`Error: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                console.log(data.data[0]);
                setBooks(data.data[0]);
            } catch (err: unknown) {
                if (err instanceof Error) {
                    console.log(err.message);
                    setMyError('We are having trouble loading the latest books, please try again later!');
                } else {
                    setMyError("We are having trouble loading the latest books, please try again later!");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, [apiUrl]);

    return (
        <div className="m-4 w-full max-w-7xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white text-center">Featured Book</h3>
            {myError ? (
                <p className="text-yellow-500 text-center">{myError}</p>
            ) : loading ? (
                <p className="text-center">Selecting featured book...</p>
            ) : (
                <div className="flex flex-wrap justify-center gap-6 p-4">
                    {books.map((item) => (
                        <FeaturedCard
                            key={`featured-${item.id}`}
                            data={item}
                            renderFields={(key: keyof Book, value: Book[keyof Book]) =>
                                key !== "title" &&
                                    key !== "author" &&
                                    key !== "isbn" &&
                                    key !== "description" &&
                                    key !== "ban_reason" &&
                                    key !== "banned_by" ? (
                                    <p key={key} className="text-gray-500 text-xs">
                                        {key}: {String(value)}
                                    </p>
                                ) : null
                            }
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default FeaturedBook; 