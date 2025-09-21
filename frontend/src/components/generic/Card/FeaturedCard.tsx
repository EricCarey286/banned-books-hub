import { ReactNode } from "react";
import Card from "./Card";
import defaultImg from "../../../assets/book-thumbnail-default.png"

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
    cover_url: string
    [key: string]: string | number | null; // Index signature for dynamic access
}


type FeaturedCardProps<T extends object> = {
    data: T;
    renderFields?: (key: keyof T, value: T[keyof T]) => ReactNode;
    apiUrl: string;
};

/**
 * Renders a featured card component with conditional rendering of fields based on data properties.
 *
 * This component takes in generic data and renderFields props, then conditionally renders specific fields such as title, author, ISBN, description, ban reason, and banned by. It uses the Card component to structure the layout and passes relevant data to it.
 *
 * @param <T extends object> - A generic type that extends an object, ensuring that data is of a valid object shape.
 * @param {FeaturedCardProps<T>} props - An object containing `data` and `renderFields`.
 * @returns JSX element representing the featured card with conditionally rendered fields.
 */
const FeaturedCard = <T extends Book>({ data, renderFields, apiUrl }: FeaturedCardProps<T>) => {
    const bookImgAlt = `${data.title} book cover image`;
    return (
        <Card
            data={data}
            renderFields={renderFields}
            clickable={false}
            leftSection={
                <>
                    {data.cover_url ? (
                        <img
                            className="mx-auto mb-4 w-30 h-30 object-contain"
                            src={`${URL_PREFIX}://${apiUrl}/book-image/${data.cover_url}`}
                            alt={bookImgAlt}
                            onError={(e) => {
                                // set default img if no img returned 
                                (e.currentTarget as HTMLImageElement).src = defaultImg;
                            }}
                        />
                    ) : (
                        <img
                            className="mx-auto mb-4 w-30 h-30 object-contain"
                            src={defaultImg}
                            alt="Default Cover"
                        />
                    )}
                    {"title" in data && typeof data.title === "string" && <h2 className="text-gray-600 text-lg font-semibold">{data.title}</h2>}
                    {"author" in data && typeof data.author === "string" && <p className="text-gray-600 text-sm">{data.author}</p>}
                    {"isbn" in data && typeof data.isbn === "string" && <p className="text-gray-500 text-xs">ISBN: {data.isbn}</p>}
                </>
            }
            rightSection={
                <>
                    {"description" in data && typeof data.description === "string" && <p className="text-gray-600 text-sm flex flex-col justify-center mb-4">{data.description}</p>}
                    {"ban_reason" in data && <p className="text-gray-500 text-xs flex flex-col justify-center mb-4"><span className="font-bold">Ban Reason:</span> {String(data.ban_reason)}</p>}
                    {"banned_by" in data && <p className="text-gray-500 text-xs flex flex-col justify-center mb-4"><span className="font-bold">Banned By:</span> {String(data.banned_by)}</p>}
                </>
            }
        />
    );
};

export default FeaturedCard;