import { useMemo, useState } from "react";
import { getTaskDueState } from "../utils/taskDueState";

const formatDate = (value) => {
  if (!value) {
    return "No deadline";
  }

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
};

const formatStatus = (value) => value.replace("_", " ");

function TaskList({
  tasks,
  onCreateSubtask,
  onDelete,
  onDeleteSubtask,
  onEdit,
  onQuickStatusChange,
  onToggleSubtask,
  isLoading,
  subtaskActionKey,
}) {
  const [expandedTaskIds, setExpandedTaskIds] = useState([]);
  const [subtaskDrafts, setSubtaskDrafts] = useState({});

  const expandedLookup = useMemo(
    () => new Set(expandedTaskIds),
    [expandedTaskIds],
  );

  const toggleExpanded = (taskId) => {
    setExpandedTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId],
    );
  };

  const handleDraftChange = (taskId, value) => {
    setSubtaskDrafts((current) => ({
      ...current,
      [taskId]: value,
    }));
  };

  const handleCreateSubtask = async (taskId) => {
    const title = subtaskDrafts[taskId]?.trim();

    if (!title) {
      return;
    }

    await onCreateSubtask(taskId, title);
    setSubtaskDrafts((current) => ({
      ...current,
      [taskId]: "",
    }));
  };

  if (isLoading) {
    return <section className="panel">Loading task list...</section>;
  }

  if (!tasks.length) {
    return (
      <section className="panel empty-state">
        <h2>No tasks found</h2>
        <p>Create your first task or widen the filters to see more results.</p>
      </section>
    );
  }

  return (
    <section className="task-list">
      {tasks.map((task) => {
        const dueState = getTaskDueState(task);
        const isExpanded = expandedLookup.has(task._id);
        const completedSubtasks = task.completedSubtasksCount || 0;
        const subtasksCount = task.subtasksCount || 0;
        const completionPercentage = task.completionPercentage || 0;
        const draftValue = subtaskDrafts[task._id] || "";
        const subtaskSummaryText = subtasksCount
          ? `${completedSubtasks}/${subtasksCount} subtasks complete`
          : task.status === "completed"
            ? "Completed with no subtasks"
            : "No subtasks yet";

        return (
          <article
            className={`task-card task-list-card${
              dueState.kind !== "none" ? ` task-card-${dueState.kind}` : ""
            }`}
            key={task._id}>
            <div className="task-card-header">
              <div className="task-card-title-block">
                <div className="task-card-title-row">
                  <h3>{task.title}</h3>
                  {dueState.label ? (
                    <span className={`pill pill-alert-${dueState.kind}`}>
                      {dueState.label}
                    </span>
                  ) : null}
                </div>

                <p className="task-description">
                  {task.description || "No description provided."}
                </p>
              </div>

              <div className="task-actions">
                <button
                  className="ghost-button"
                  onClick={() => onEdit(task)}
                  type="button">
                  Edit
                </button>

                <button
                  className="danger-button"
                  onClick={() => onDelete(task._id)}
                  type="button">
                  Delete
                </button>
              </div>
            </div>

            <div className="task-meta">
              <span className={`pill pill-${task.status}`}>
                {formatStatus(task.status)}
              </span>
              <span className={`pill pill-priority-${task.priority}`}>
                {task.priority}
              </span>
              <span className="pill pill-neutral">{formatDate(task.dueDate)}</span>
              <span className="pill pill-neutral">
                {completedSubtasks}/{subtasksCount} subtasks
              </span>
            </div>

            <div className="task-card-footer-grid">
              <section className="subtask-summary task-progress-summary">
                <div className="subtask-summary-row">
                  <strong>Progress</strong>
                  <span>{completionPercentage}%</span>
                </div>

                <div className="progress-track" aria-hidden="true">
                  <div
                    className="progress-fill"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>

                <p className="info-text">{subtaskSummaryText}</p>
              </section>

              <div className="task-footer">
                <div className="tag-list">
                  {task.tags?.length ? (
                    task.tags.map((tag) => <span key={tag}>#{tag}</span>)
                  ) : (
                    <span>#untagged</span>
                  )}
                </div>

                <div className="task-quick-actions">
                  <button
                    className="ghost-button"
                    onClick={() => toggleExpanded(task._id)}
                    type="button">
                    {isExpanded ? "Hide subtasks" : "Show subtasks"}
                  </button>

                  <button
                    className={
                      task.status === "completed"
                        ? "ghost-button"
                        : "primary-button"
                    }
                    onClick={() =>
                      onQuickStatusChange(
                        task,
                        task.status === "completed" ? "todo" : "completed",
                      )
                    }
                    type="button">
                    {task.status === "completed" ? "Reopen" : "Mark done"}
                  </button>
                </div>
              </div>
            </div>

            {isExpanded ? (
              <section className="subtask-panel">
                <div className="subtask-create-row">
                  <input
                    onChange={(event) =>
                      handleDraftChange(task._id, event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleCreateSubtask(task._id);
                      }
                    }}
                    placeholder="Add a subtask..."
                    value={draftValue}
                  />

                  <button
                    className="primary-button"
                    disabled={
                      subtaskActionKey === `create:${task._id}` ||
                      !draftValue.trim()
                    }
                    onClick={() => handleCreateSubtask(task._id)}
                    type="button">
                    Add
                  </button>
                </div>

                <div className="subtask-list">
                  {task.subtasks?.length ? (
                    task.subtasks.map((subtask) => (
                      <div className="subtask-item" key={subtask._id}>
                        <label className="subtask-checkbox">
                          <input
                            checked={subtask.isCompleted}
                            disabled={subtaskActionKey === `toggle:${subtask._id}`}
                            onChange={() =>
                              onToggleSubtask(task._id, subtask._id, {
                                isCompleted: !subtask.isCompleted,
                              })
                            }
                            type="checkbox"
                          />

                          <span
                            className={
                              subtask.isCompleted
                                ? "subtask-title completed-subtask"
                                : "subtask-title"
                            }>
                            {subtask.title}
                          </span>
                        </label>

                        <button
                          className="danger-button"
                          disabled={subtaskActionKey === `delete:${subtask._id}`}
                          onClick={() => onDeleteSubtask(task._id, subtask._id)}
                          type="button">
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="info-text">
                      No subtasks yet. Add one to break the work down.
                    </p>
                  )}
                </div>
              </section>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

export default TaskList;
