import { useEffect, useState } from "react";

const emptyForm = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  dueDate: "",
  tags: "",
};

function TaskForm({ initialValues, onSubmit, isSubmitting, onCancel }) {
  const [formValues, setFormValues] = useState(emptyForm);

  useEffect(() => {
    if (initialValues) {
      setFormValues({
        title: initialValues.title || "",
        description: initialValues.description || "",
        status: initialValues.status || "todo",
        priority: initialValues.priority || "medium",
        dueDate: initialValues.dueDate ? initialValues.dueDate.slice(0, 10) : "",
        tags: initialValues.tags?.join(", ") || "",
      });
      return;
    }

    setFormValues(emptyForm);
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(formValues, () => setFormValues(emptyForm));
  };

  return (
    <section className="panel accent-panel task-form-panel">
      <div className="task-form-heading">
        <p className="eyebrow compact-eyebrow">
          {initialValues ? "Editing task" : "Quick capture"}
        </p>
        <h2>{initialValues ? "Update task" : "Create task"}</h2>
        <p className="task-form-copy">
          Keep it concise now and refine the details later with subtasks.
        </p>
      </div>

      <form className="task-form" onSubmit={handleSubmit}>
        <label>
          Title
          <input
            name="title"
            onChange={handleChange}
            placeholder="Ship the production-ready todo app"
            required
            value={formValues.title}
          />
        </label>

        <label>
          Description
          <textarea
            name="description"
            onChange={handleChange}
            placeholder="Add details, blockers, or acceptance criteria..."
            rows="4"
            value={formValues.description}
          />
        </label>

        <div className="form-grid">
          <label>
            Status
            <select name="status" onChange={handleChange} value={formValues.status}>
              <option value="todo">Todo</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </label>

          <label>
            Priority
            <select
              name="priority"
              onChange={handleChange}
              value={formValues.priority}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          <label>
            Due date
            <input
              name="dueDate"
              onChange={handleChange}
              type="date"
              value={formValues.dueDate}
            />
          </label>

          <label className="form-row-span-2">
            Tags
            <input
              name="tags"
              onChange={handleChange}
              placeholder="work, api, urgent"
              value={formValues.tags}
            />
          </label>
        </div>

        <div className="form-actions">
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting
              ? "Saving..."
              : initialValues
                ? "Update task"
                : "Create task"}
          </button>

          {initialValues ? (
            <button className="ghost-button" onClick={onCancel} type="button">
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

export default TaskForm;
