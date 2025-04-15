import React from "react";

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

interface TableProps {
    data: Array<Book>;
    visibleColumns: string[]; // Columns to display and their order
    headers?: Record<string, string>; // Optional mapping for header labels
}

const Table: React.FC<TableProps> = ({ data, visibleColumns, headers = {} }) => {
    return (
        <table className="w-full border-collapse my-5 text-base text-left">
            <thead>
                <tr>
                    {visibleColumns.map((column) => (
                        <th key={column} className="border border-black p-2 text-left">
                            {headers[column] || column}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {data.map((item, rowIndex) => (
                    <tr key={rowIndex}>
                        {visibleColumns.map((column) => (
                            <td key={column} className="border border-black p-2">
                                {item[column] ?? "N/A"}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default Table;