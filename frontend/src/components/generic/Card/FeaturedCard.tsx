import { ReactNode } from 'react';

type CardProps<T extends object> = {
    data: T;
    renderFields?: (key: keyof T, value: T[keyof T]) => ReactNode;
};

const FeaturedCard = <T extends object>({ data, renderFields }: CardProps<T>) => {
    return (
        <div className="bg-white shadow-md rounded-2xl p-4 border border-gray-200 transform transition duration-300 hover:scale-105">
            <div className="flex justify-between pb-4">
                {/* Left Section */}
                <div className="flex-1 pr-4 flex flex-col justify-center">
                    {"title" in data && typeof data.title === "string" && (
                        <h2 className="text-gray-600 text-lg font-semibold">{data.title}</h2>
                    )}
                    {"author" in data && typeof data.author === "string" && (
                        <p className="text-gray-600 text-sm">{data.author}</p>
                    )}
                    {"isbn" in data && typeof data.isbn === "string" && (
                        <p className="text-gray-500 text-xs">ISBN: {data.isbn}</p>
                    )}
                </div>

                {/* Separator Bar */}
                <div className="border-l border-gray-300"></div>

                {/* Right Section */}
                <div className="flex-1 pl-4 text-center">
                    {"description" in data && typeof data.description === "string" && (
                        <p className="text-gray-600 text-sm mt-2">{data.description}</p>
                    )}
                    {"ban_reason" in data && data.ban_reason !== null && (
                        <p className="text-gray-500 text-xs"><span className="font-bold">Ban Reason:</span> {String(data.ban_reason)}</p>
                    )}
                    {"banned_by" in data && data.banned_by !== null && (
                        <p className="text-gray-500 text-xs"><span className="font-bold">Banned By:</span> {String(data.banned_by)}</p>
                    )}
                </div>
            </div>

            {/* Render Additional Fields */}
            {renderFields &&
                Object.entries(data)
                    .filter(([key]) => key !== "id" && key !== "created_on" && key !== "updated_on")
                    .map(([key, value]) => renderFields(key as keyof T, value))}
        </div>
    );
};

export default FeaturedCard;