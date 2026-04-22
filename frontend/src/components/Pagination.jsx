function Pagination({ pagination, onPageChange }) {
  if (!pagination) {
    return null;
  }

  return (
    <div className="pagination pagination-panel">
      <button
        className="ghost-button"
        disabled={!pagination.hasPrevPage}
        onClick={() => onPageChange(pagination.page - 1)}
        type="button"
      >
        Previous
      </button>
      <span>
        Page {pagination.page} of {pagination.totalPages} · {pagination.total} tasks
      </span>
      <button
        className="ghost-button"
        disabled={!pagination.hasNextPage}
        onClick={() => onPageChange(pagination.page + 1)}
        type="button"
      >
        Next
      </button>
    </div>
  );
}

export default Pagination;
