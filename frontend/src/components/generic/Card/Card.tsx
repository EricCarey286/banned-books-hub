import { ReactNode } from "react";

type CardProps<T extends object> = {
    data: T;
    renderFields?: (key: keyof T, value: T[keyof T]) => ReactNode;
    clickable?: boolean;
    header?: ReactNode;
    leftSection?: ReactNode;
    rightSection?: ReactNode;
    onClick?: () => void;
};

const Card = <T extends object>({
    data,
    renderFields,
    clickable,
    header,
    leftSection,
    rightSection,
    onClick
}: CardProps<T>) => {
    return (
        <div className={`bg-white shadow-md rounded-lg p-4 flex flex-col h-full border border-gray-200 transform transition duration-300 
            ${clickable ? "hover:scale-105 cursor-pointer" : ""}`}
            onClick={clickable ? onClick : undefined}
            >
            {header && <div className="pb-2">{header}</div>}

            {leftSection || rightSection ? (
                <div className="flex justify-between pb-4">
                    {leftSection && <div className="flex-1 pr-4">{leftSection}</div>}
                    {leftSection && rightSection && <div className="border-l border-gray-300"></div>}
                    {rightSection && <div className="flex-1 pl-4 text-center">{rightSection}</div>}
                </div>
            ) : (
                /* Default case: Render all fields in a simple list */
                Object.entries(data)
                    .filter(([key]) => key !== "id" && key !== "created_on" && key !== "updated_on")
                    .map(([key, value]) =>
                        renderFields ? renderFields(key as keyof T, value) : (
                            <p key={key} className="text-gray-600 text-sm">{`${key}: ${String(value)}`}</p>
                        )
                    )
            )}
        </div>
    );
};

export default Card;