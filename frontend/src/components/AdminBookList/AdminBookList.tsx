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

/**
 * A React functional component that lists books or suggested books with pagination and error handling.
 *
 * This component fetches book data from an API using `authFetch` and displays it in a table format. It handles pagination,
 * toggling visibility of the list, and displaying errors if they occur during data fetching.
 *
 * @param apiUrl - The base URL for the API endpoint.
 * @param bookList - Specifies the type of book list to fetch ('suggested_books' or 'books').
 * @param authFetch - A function used to make authenticated API requests.
 * @returns JSX element representing the book list interface.
 */
const AdminBooksList: React.FC<BookListProps> = ({ apiUrl, bookList, authFetch }) => {

    const [books, setBooks] = useState<Book[]>([]);
    const [myError, setMyError] = useState<string | null>(null);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [isVisible, setIsVisible] = useState(false);

    let visibleColumns = []
    let headers = {}

    // Fetch data from the backend
    useEffect(() => {
        /**
         * Fetches a list of books from the API and updates the state with the results.
         *
         * This function makes an asynchronous request to fetch book data using the `authFetch` method.
         * It constructs the request URL using the provided constants and parameters. If the response is not okay,
         * it logs an error message and throws an exception with the status details. Upon successful retrieval of the data,
         * it updates the books state and whether there is a next page available. In case of an error, it sets
         * an appropriate error message in the state. Finally, regardless of the outcome, it stops loading.
         */
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

    if (bookList == 'suggested_books' || bookList == 'books') {
        visibleColumns = ['id', 'title', 'author', 'description', 'banned_by', 'ban_reason', 'isbn']
        headers = {
            id: "ID",
            title: "Titlle",
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

    /**
     * Handles navigation to the next or previous page based on the action provided.
     *
     * This function updates the current page number by incrementing or decrementing it,
     * depending on whether the 'next' or 'prev' action is specified. It ensures that
     * navigating to the previous page does not go below the first page (pageNumber 1).
     * If an error occurs during this process, it logs the error and sets a generic
     * error message.
     *
     * @param {string} action - The navigation action to perform ('next' or 'prev').
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
            setMyError('An unexpected error occurred. Please refresh or try again later.');
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