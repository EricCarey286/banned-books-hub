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
    apiUrl: string; // The base URL of your backend API
}

const FeaturedBook: React.FC<BookListProps> = ({ apiUrl }) => {

    const [books, setBooks] = useState<Book[]>([]);
    const [myError, setMyError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);


    // Fetch data from the backend
    useEffect(() => {
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
                    setMyError('An error occured while fetching the featured book. Please try again later.');
                } else {
                    setMyError("An unknown error occurred.");
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
                <p className="text-red-500 text-center">Error: {myError}</p>
            ) : loading ? (
                <p className="text-center">Loading Books...</p>
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