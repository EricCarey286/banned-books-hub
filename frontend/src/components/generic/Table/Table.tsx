import React, { useState } from "react";

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
  [key: string]: string | number | null;
}

interface TableProps {
  data: Array<Book>;
  visibleColumns: string[];
  headers?: Record<string, string>;
}

const Table: React.FC<TableProps> = ({ data, visibleColumns, headers = {} }) => {
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>({});

  const toggleCell = (rowIndex: number, column: string) => {
    const key = `${rowIndex}-${column}`;
    setExpandedCells((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full border-collapse my-5 text-base text-left">
        <thead>
          <tr>
            {visibleColumns.map((column) => (
              <th
                key={column}
                className="border border-black p-2 whitespace-nowrap"
              >
                {headers[column] || column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIndex) => (
            <tr key={rowIndex}>
              {visibleColumns.map((column) => {
                const key = `${rowIndex}-${column}`;
                const content = item[column] ?? "N/A";
                const isExpanded = expandedCells[key];

                return (
                  <td
                    key={column}
                    className={`border border-black p-2 cursor-pointer transition-all ${
                      isExpanded
                        ? "whitespace-normal break-words"
                        : "truncate overflow-hidden whitespace-nowrap max-w-[200px]"
                    }`}
                    title={!isExpanded ? String(content) : undefined}
                    onClick={() => toggleCell(rowIndex, column)}
                  >
                    {String(content)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;