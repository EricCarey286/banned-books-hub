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
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AdminBooksList: React.FC<BookListProps> = ({ apiUrl, bookList,  authFetch }) => {

    const [books, setBooks] = useState<Book[]>([]);
    const [myError, setMyError] = useState<string | null>(null);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [isVisible, setIsVisible] = useState(false);

    let visibleColumns =[]
    let headers = {}

    // Fetch data from the backend
    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const response = await authFetch(`${URL_PREFIX}://${apiUrl}/${bookList}?page=${pageNumber}`);
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
    }, [pageNumber, apiUrl, bookList, authFetch]);

    if (bookList == 'suggested_books' || bookList == 'books'){
        visibleColumns= ['id','title', 'author', 'description', 'banned_by', 'ban_reason', 'isbn']
        headers= {
            id: "ID",
            title: "Titlle",
            author: "Author",
            description: "Description",
            banned_by: "Banned By",
            ban_reason: "Ban Reasoning",
            isbn: "ISBN",
        } 
    } else {
        visibleColumns= ['id','name', 'email', 'message', 'created_on', 'updated_on']
        headers= {
            id: "ID",
            name: "Name",
            email: "Email",
            message: "Message",
            created_on: "Created On",
            updated_on: "Updated On"
        } 
    }

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
                <button 
                    onClick={() => setIsVisible(!isVisible)} 
                    className="text-white-400 hover:text-blue-700"
                >
                    Toggle List
                </button>
            </div>
            <div className={`mt-4 p-4rounded ${isVisible ? "" : "invisible h-0"}`}>
                <div className="m-4">
                    {myError ? (
                        <p style={{ color: "red" }}>Error: {myError}</p>
                    ) : loading ? (
                        <p>Loading Records...</p>
                    ) : (
                        <div>
                            <Table
                                data={books}
                                visibleColumns={visibleColumns}
                                headers={headers} 
                            />
                        </div>
                    )}
                </div>
                <div className='book-container'>
                    <PageButton onClick={() => nextPage('prev')} action='prev' disabled={pageNumber === 1} currentPage={pageNumber} />
                    <PageButton onClick={() => nextPage('next')} action='next' disabled={!hasNextPage} currentPage={pageNumber} />
                </div>
            </div>
        </>
    );
};

export default AdminBooksList; 