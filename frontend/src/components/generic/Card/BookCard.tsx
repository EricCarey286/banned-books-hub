import { ReactNode } from "react";

import Card from "./Card";

type BookCardProps<T extends object> = {
    data: T;
    renderFields?: (key: keyof T, value: T[keyof T]) => ReactNode;
};

const BookCard = <T extends object>({ data, renderFields }: BookCardProps<T>) => {
    return (
        <Card
            data={data}
            renderFields={renderFields}
            clickable={true}
            header={
                <>
                    {"title" in data  && typeof data.title === "string" && <h2 className="text-gray-600 text-lg font-semibold">{data.title}</h2>}
                    {"author" in data  && typeof data.author === "string" && <p className="text-gray-600 text-sm mb-4">Author: {data.author}</p>}
                    {"ban_reason" in data && <p className="text-gray-500 text-xs"><span className="font-bold">Ban Reason:</span> {String(data.ban_reason)}</p>}
                </>
            }
        />
    );
};

export default BookCard;