import React from 'react';

interface TableProps {
  headers: string[];
  rows: (string | React.ReactNode)[][];
  className?: string;
}

export const Table: React.FC<TableProps> = ({
  headers,
  rows,
  className = '',
}) => {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/20">
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-white/5 transition-colors">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-6 py-4 whitespace-nowrap text-sm text-white/90"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


