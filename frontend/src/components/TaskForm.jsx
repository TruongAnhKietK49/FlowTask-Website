import { useEffect, useState } from "react";

const emptyForm = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  dueDate: "",
  tags: "",
  assignedTo: "",
};

const getMemberUser = (member) => {
  if (!member?.user) {
    return null;
  }

  return typeof member.user === "object"
    ? member.user
    : { _id: member.user, name: "", email: "" };
};

function TaskForm({
  embedded = false,
  initialValues,
  isDisabled,
  isSubmitting,
  onCancel,
  onSubmit,
  projectMembers,
  selectedProject,
}) {
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
        assignedTo: initialValues.assignedTo?._id || initialValues.assignedTo || "",
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

  const shouldShowCancel = Boolean(onCancel);

  const content = (
    <>
      <div className="task-form-heading">
        <p className="eyebrow compact-eyebrow">
          {initialValues ? "Editing task" : "Quick capture"}
        </p>
        <h2>{initialValues ? "Update task" : "Create task"}</h2>
        <p className="task-form-copy">
          {selectedProject
            ? `New tasks will land inside ${selectedProject.name}.`
            : "Select a project first so new tasks have a workspace scope."}
        </p>
      </div>

      <form className="task-form" onSubmit={handleSubmit}>
        <label>
          Title
          <input
            disabled={isDisabled}
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
            disabled={isDisabled}
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
            <select
              disabled={isDisabled}
              name="status"
              onChange={handleChange}
              value={formValues.status}>
              <option value="todo">Todo</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </label>

          <label>
            Priority
            <select
              disabled={isDisabled}
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
              disabled={isDisabled}
              name="dueDate"
              onChange={handleChange}
              type="date"
              value={formValues.dueDate}
            />
          </label>

          <label>
            Assigned to
            <select
              disabled={isDisabled}
              name="assignedTo"
              onChange={handleChange}
              value={formValues.assignedTo}>
              <option value="">Unassigned</option>
              {projectMembers.map((member) => {
                const memberUser = getMemberUser(member);

                if (!memberUser?._id) {
                  return null;
                }

                return (
                  <option key={memberUser._id} value={memberUser._id}>
                    {memberUser.name || memberUser.email || "Unknown member"} (
                    {member.role})
                  </option>
                );
              })}
            </select>
          </label>

          <label className="form-row-span-2">
            Tags
            <input
              disabled={isDisabled}
              name="tags"
              onChange={handleChange}
              placeholder="work, api, urgent"
              value={formValues.tags}
            />
          </label>
        </div>

        <div className="form-actions">
          <button
            className="primary-button"
            disabled={isDisabled || isSubmitting}
            type="submit">
            {isSubmitting
              ? "Saving..."
              : initialValues
                ? "Update task"
                : "Create task"}
          </button>

          {shouldShowCancel ? (
            <button
              className="ghost-button"
              disabled={isDisabled}
              onClick={onCancel}
              type="button">
              {initialValues ? "Cancel edit" : "Cancel"}
            </button>
          ) : null}
        </div>
      </form>
    </>
  );

  if (embedded) {
    return <div className="task-form-embedded">{content}</div>;
  }

  return (
    <section className="panel accent-panel task-form-panel">
      {content}
    </section>
  );
}

export default TaskForm;
