import { ReactNode } from "react";

import Card from "./Card";

type FeaturedCardProps<T extends object> = {
    data: T;
    renderFields?: (key: keyof T, value: T[keyof T]) => ReactNode;
};

const FeaturedCard = <T extends object>({ data, renderFields }: FeaturedCardProps<T>) => {
    return (
        <Card
            data={data}
            renderFields={renderFields}
            clickable={false}
            leftSection={
                <>
                    {"title" in data  && typeof data.title === "string" && <h2 className="text-gray-600 text-lg font-semibold">{data.title}</h2>}
                    {"author" in data  && typeof data.author === "string" && <p className="text-gray-600 text-sm">{data.author}</p>}
                    {"isbn" in data  && typeof data.isbn === "string"&& <p className="text-gray-500 text-xs">ISBN: {data.isbn}</p>}
                </>
            }
            rightSection={
                <>
                    {"description" in data  && typeof data.description === "string" && <p className="text-gray-600 text-sm">{data.description}</p>}
                    {"ban_reason" in data && <p className="text-gray-500 text-xs"><span className="font-bold">Ban Reason:</span> {String(data.ban_reason)}</p>}
                    {"banned_by" in data && <p className="text-gray-500 text-xs"><span className="font-bold">Banned By:</span> {String(data.banned_by)}</p>}
                </>
            }
        />
    );
};

export default FeaturedCard;