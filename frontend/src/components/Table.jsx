function Table({ columns = [], data = [], rowKey = "id", emptyMessage = "Nenhum registro encontrado.", className = "" }) {
  return (
    <div className={`w-full overflow-x-auto rounded-lg border border-gray-100 ${className}`}>
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {data.length > 0 ? data.map((row, index) => (
            <tr key={row[rowKey] ?? index} className="transition-colors hover:bg-gray-50">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-ink">
                  {typeof column.render === "function" ? column.render(row, index) : row[column.key] ?? "—"}
                </td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={Math.max(columns.length, 1)} className="px-4 py-8 text-center text-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
