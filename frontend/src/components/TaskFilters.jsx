import { useState } from "react";

function TaskFilters({ filters, onChange, onReset, isLoading }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasAdvancedOverrides =
    filters.sortBy !== "createdAt" ||
    filters.sortOrder !== "desc" ||
    filters.limit !== "10";

  const isAdvancedOpen = showAdvanced || hasAdvancedOverrides;

  const handleReset = () => {
    setShowAdvanced(false);
    onReset();
  };

  return (
    <section className="filters-panel">
      <div className="filters-toolbar">
        <div>
          <h3>Filters</h3>
          <p>
            {isLoading
              ? "Refreshing tasks..."
              : "Search first, then narrow the current result set."}
          </p>
        </div>

        <div className="filters-actions">
          <button
            aria-expanded={isAdvancedOpen}
            className="ghost-button"
            onClick={() => setShowAdvanced((current) => !current)}
            type="button">
            {isAdvancedOpen ? "Hide extras" : "More filters"}
          </button>

          <button
            className="ghost-button"
            onClick={handleReset}
            type="button">
            Reset
          </button>
        </div>
      </div>

      <div className="filter-grid filter-grid-primary">
        <label className="filter-field-search">
          Search
          <input
            name="search"
            onChange={onChange}
            placeholder="Find by title, description, tag, or subtask..."
            value={filters.search}
          />
        </label>

        <label>
          Status
          <select name="status" onChange={onChange} value={filters.status}>
            <option value="">All</option>
            <option value="todo">Todo</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </label>

        <label>
          Priority
          <select name="priority" onChange={onChange} value={filters.priority}>
            <option value="">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>

      <div
        className={`filter-grid filter-grid-secondary${
          isAdvancedOpen ? " is-open" : ""
        }`}>
        <label>
          Sort by
          <select name="sortBy" onChange={onChange} value={filters.sortBy}>
            <option value="createdAt">Created at</option>
            <option value="updatedAt">Updated at</option>
            <option value="dueDate">Due date</option>
            <option value="priority">Priority</option>
            <option value="status">Status</option>
            <option value="title">Title</option>
          </select>
        </label>

        <label>
          Order
          <select name="sortOrder" onChange={onChange} value={filters.sortOrder}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>

        <label>
          Per page
          <select name="limit" onChange={onChange} value={filters.limit}>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </label>
      </div>
    </section>
  );
}

export default TaskFilters;
