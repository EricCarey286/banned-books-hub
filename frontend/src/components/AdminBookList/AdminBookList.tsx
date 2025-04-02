import { useEffect, useState } from "react";
import PageButton from "../generic/Button/PageButton";
import Table from "../generic/Table/Table";

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
    bookList: string;
}

const AdminBooksList: React.FC<BookListProps> = ({ apiUrl, bookList }) => {

    const [books, setBooks] = useState<Book[]>([]);
    const [myError, setMyError] = useState<string | null>(null);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);
    const [hasNextPage, setHasNextPage] = useState(true);


    // Fetch data from the backend
    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const response = await fetch(`${URL_PREFIX}://${apiUrl}/${bookList}?page=${pageNumber}`);
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
    }, [pageNumber, apiUrl, bookList]);

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
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{bookList} Books</h3>
                {myError ? (
                    <p style={{ color: "red" }}>Error: {myError}</p>
                ) : loading ? (
                    <p>Loading Books...</p>
                ) : (
                    <div>
                        <Table
                            data={books}
                            visibleColumns={['id','title', 'author', 'description', 'banned_by', 'ban_reason', 'isbn']}
                            headers={{
                                id: "ID",
                                title: "Titlle",
                                author: "Author",
                                description: "Description",
                                banned_by: "Banned By",
                                ban_reason: "Ban Reasoning",
                                isbn: "ISBN",
                            }} 
                        />
                    </div>
                )}
            </div>
            <div className='book-container'>
                <PageButton onClick={() => nextPage('prev')} action='prev' disabled={pageNumber === 1} currentPage={pageNumber} />
                <PageButton onClick={() => nextPage('next')} action='next' disabled={!hasNextPage} currentPage={pageNumber} />
            </div>
        </>
    );
};

export default AdminBooksList; 