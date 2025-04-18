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
    [key: string]: string | number | null; // Index signature for dynamic access
}
interface BookListProps {
    apiUrl: string;
}

const BooksList: React.FC<BookListProps> = ({ apiUrl }) => {

    const [books, setBooks] = useState<Book[]>([]);
    const [myError, setMyError] = useState<string | null>(null);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);
    const [hasNextPage, setHasNextPage] = useState(true);


    // Fetch data from the backend
    useEffect(() => {
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
                    console.log(err.message);
                    setMyError('An error occured while fetching the books. Please refresh or try again later.');
                } else {
                    setMyError("An unknown error occurred.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, [pageNumber, apiUrl]);

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
            setMyError('An unexpected error occurred. Please refresh or try again later.');
        }
    }

    return (
        <>
            <div className="m-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Banned Books</h3>
                {myError ? (
                    <p style={{ color: "red" }}>Error: {myError}</p>
                ) : loading ? (
                    <p>Loading Books...</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-5 p-2">
                        {books.map((item) => (
                            <BookCard
                            key={`bookList-${item.id}`}
                            data={item}
                            renderFields={(key: keyof Book, value: Book[keyof Book]) => (
                              key !== "title" && key !== "author" && key !== "isbn" && key !== "description" && key !== "ban_reason" && key !== "banned_by" ? (
                                <p key={key} className="text-gray-500 text-xs">
                                  {key}: {String(value)}
                                </p>
                              ) : null
                            )}
                          />
                        ))}
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