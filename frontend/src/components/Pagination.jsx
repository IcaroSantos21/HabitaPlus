function Pagination({ currentPage = 1, totalPages = 1, onPageChange, className = "" }) {
  const pageCount = Math.max(1, totalPages);
  const activePage = Math.min(Math.max(1, currentPage), pageCount);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  const goTo = (page) => {
    if (page >= 1 && page <= pageCount && page !== activePage) onPageChange?.(page);
  };

  return (
    <nav aria-label="Paginação" className={`flex flex-wrap items-center justify-center gap-1 ${className}`}>
      <button type="button" onClick={() => goTo(activePage - 1)} disabled={activePage === 1} className="rounded-md border border-gray-200 px-3 py-2 text-sm text-ink hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
        Anterior
      </button>
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => goTo(page)}
          aria-current={activePage === page ? "page" : undefined}
          className={`min-w-9 rounded-md border px-3 py-2 text-sm ${activePage === page ? "border-brand-teal bg-brand-teal font-semibold text-white" : "border-gray-200 text-ink hover:bg-gray-50"}`}
        >
          {page}
        </button>
      ))}
      <button type="button" onClick={() => goTo(activePage + 1)} disabled={activePage === pageCount} className="rounded-md border border-gray-200 px-3 py-2 text-sm text-ink hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
        Próxima
      </button>
    </nav>
  );
}

export default Pagination;
