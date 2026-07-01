import { useEffect, useState } from "react";
import PageButton from "../generic/Button/PageButton";
import Table from "../generic/Table/Table";
import { Book } from "../../types/book";
import { buildUrl } from "../../utils/api";

interface BookListProps {
    apiUrl: string;
    bookList: string;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AdminBooksList: React.FC<BookListProps> = ({ apiUrl, bookList, authFetch }) => {

    const [books, setBooks] = useState<Book[]>([]);
    const [myError, setMyError] = useState<string | null>(null);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [isVisible, setIsVisible] = useState(false);

    let visibleColumns = []
    let headers = {}

    useEffect(() => {
        const fetchBooks = async () => {
            setLoading(true);
            try {
                const response = await authFetch(buildUrl(apiUrl, `/${bookList}?page=${pageNumber}`));
                if (!response.ok) {
                    throw new Error(`Error: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                setBooks(data.data);
                setHasNextPage(data.meta.hasNextPage);
            } catch (err: unknown) {
                if (err instanceof Error) {
                    console.error(err.message);
                }
                setMyError('An error occurred while fetching the records. Please refresh or try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, [pageNumber, apiUrl, bookList, authFetch]);

    if (bookList === 'suggested_books' || bookList === 'books') {
        visibleColumns = ['id', 'title', 'author', 'description', 'banned_by', 'ban_reason', 'isbn']
        headers = {
            id: "ID",
            title: "Title",
            author: "Author",
            description: "Description",
            banned_by: "Banned By",
            ban_reason: "Ban Reasoning",
            isbn: "ISBN",
        }
    } else {
        visibleColumns = ['id', 'name', 'email', 'message', 'created_on', 'updated_on']
        headers = {
            id: "ID",
            name: "Name",
            email: "Email",
            message: "Message",
            created_on: "Created On",
            updated_on: "Updated On"
        }
    }

    function nextPage(action: string) {
        if (action === 'next') {
            setPageNumber(pageNumber + 1);
        } else if (action === 'prev') {
            if (pageNumber === 1) return;
            setPageNumber(pageNumber - 1);
        }
    }

    return (
        <>
            <div className="m-4">
                <button
                    onClick={() => setIsVisible(!isVisible)}
                    className="text-blue-600 hover:text-blue-800 font-medium transition"
                >
                    Toggle List
                </button>
            </div>

            <div className={`transition-all duration-300 ${isVisible ? "mt-4 p-4 rounded" : "invisible h-0 overflow-hidden"}`}>
                <div className="m-4">
                    {myError ? (
                        <p className="text-red-500">Error: {myError}</p>
                    ) : loading ? (
                        <p>Loading Records...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table
                                data={books}
                                visibleColumns={visibleColumns}
                                headers={headers}
                            />
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 justify-center items-center mt-4">
                    <PageButton
                        onClick={() => nextPage('prev')}
                        action='prev'
                        disabled={pageNumber === 1}
                        currentPage={pageNumber}
                    />
                    <PageButton
                        onClick={() => nextPage('next')}
                        action='next'
                        disabled={!hasNextPage}
                        currentPage={pageNumber}
                    />
                </div>
            </div>
        </>
    );
};

export default AdminBooksList;
