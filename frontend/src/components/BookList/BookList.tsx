import { useEffect, useState } from "react";
import PageButton from "../generic/Button/PageButton";
import BookCard from "../generic/Card/BookCard";
import { Book } from "../../types/book";
import { buildUrl } from "../../utils/api";

interface BookListProps {
    apiUrl: string;
}

const BooksList: React.FC<BookListProps> = ({ apiUrl }) => {

    const [books, setBooks] = useState<Book[]>([]);
    const [myError, setMyError] = useState<string | null>(null);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);
    const [hasNextPage, setHasNextPage] = useState(true);

    useEffect(() => {
        const fetchBooks = async () => {
            setLoading(true);
            try {
                const response = await fetch(buildUrl(apiUrl, `/books?page=${pageNumber}`));
                if (!response.ok) {
                    throw new Error(`Error: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                setBooks(data.data);
                setHasNextPage(data.meta.hasNextPage);
            } catch (err: unknown) {
                if (err instanceof Error) {
                    console.error(`Error on /books fetch: ${err.message}`);
                }
                setMyError('We are having trouble loading the latest books, please try again later!');
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, [pageNumber, apiUrl]);

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
                                "cover_url"
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
                                    apiUrl={apiUrl}
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
