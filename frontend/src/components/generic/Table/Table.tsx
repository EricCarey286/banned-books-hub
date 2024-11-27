import React from "react";
import './Table.css';

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
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
                <tr>
                    {visibleColumns.map((column) => (
                        <th key={column} style={{ border: "1px solid black", padding: "8px", textAlign: "left" }}>
                            {headers[column] || column} {/* Display custom header or column name */}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {data.map((item, rowIndex) => (
                    <tr key={rowIndex}>
                        {visibleColumns.map((column) => (
                            <td key={column} style={{ border: "1px solid black", padding: "8px" }}>
                                {item[column] ?? "N/A"} {/* Show "N/A" if the value is missing */}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default Table;