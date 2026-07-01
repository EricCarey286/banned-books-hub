import { useEffect, useState } from "react";
import FeaturedCard from "../generic/Card/FeaturedCard";
import { Book } from "../../types/book";
import { buildUrl } from "../../utils/api";

interface BookListProps {
    apiUrl: string;
}

const FeaturedBook: React.FC<BookListProps> = ({ apiUrl }) => {

    const [books, setBooks] = useState<Book[]>([]);
    const [myError, setMyError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const response = await fetch(buildUrl(apiUrl, '/books/featured'));
                if (!response.ok) {
                    throw new Error(`Error: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                setBooks(data.data[0]);
            } catch (err: unknown) {
                if (err instanceof Error) {
                    console.error(err.message);
                }
                setMyError('We are having trouble loading the latest books, please try again later!');
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
                            apiUrl={apiUrl}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default FeaturedBook;
