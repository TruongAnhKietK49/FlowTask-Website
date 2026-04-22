/* eslint-disable no-unused-vars */
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import KanbanBoard from "../components/KanbanBoard";
import Navbar from "../components/Navbar";
import Pagination from "../components/Pagination";
import TaskFilters from "../components/TaskFilters";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import {
  createSubtask,
  createTask,
  deleteSubtask,
  deleteTask,
  getTasks,
  updateSubtask,
  updateTask,
  updateTaskStatus,
} from "../api/taskApi";
import { useAuth } from "../hooks/useAuth";

const defaultFilters = {
  search: "",
  status: "",
  priority: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  limit: "10",
  page: 1,
};

function DashboardPage() {
  const { token, user } = useAuth();
  const [filters, setFilters] = useState(defaultFilters);
  const [viewMode, setViewMode] = useState("list");
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subtaskActionKey, setSubtaskActionKey] = useState("");

  const deferredSearch = useDeferredValue(filters.search);

  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await getTasks(token, {
          ...filters,
          search: deferredSearch,
        });
        setTasks(response.data);
        setPagination(response.pagination);
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [
    deferredSearch,
    filters.limit,
    filters.page,
    filters.priority,
    filters.sortBy,
    filters.sortOrder,
    filters.status,
    token,
  ]);

  const taskSummary = useMemo(
    () =>
      tasks.reduce(
        (summary, task) => {
          summary[task.status] += 1;
          return summary;
        },
        {
          todo: 0,
          in_progress: 0,
          completed: 0,
        },
      ),
    [tasks],
  );

  const totalVisibleTasks = pagination?.total ?? tasks.length;
  const workspaceTitle = user?.name ? `${user.name}'s tasks` : "Your tasks";

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    startTransition(() => {
      setFilters((current) => ({
        ...current,
        [name]: value,
        page: 1,
      }));
    });
  };

  const refreshTasks = async () => {
    const response = await getTasks(token, {
      ...filters,
      search: deferredSearch,
    });
    setTasks(response.data);
    setPagination(response.pagination);
  };

  const handleTaskSubmit = async (formValues, resetForm) => {
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    const payload = {
      ...formValues,
      dueDate: formValues.dueDate || null,
      tags: formValues.tags,
    };

    try {
      if (editingTask) {
        await updateTask(token, editingTask._id, payload);
        setSuccessMessage("Task updated successfully.");
        setEditingTask(null);
      } else {
        await createTask(token, payload);
        setSuccessMessage("Task created successfully.");
        resetForm();
      }

      await refreshTasks();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (taskId) => {
    setError("");
    setSuccessMessage("");

    try {
      await deleteTask(token, taskId);
      setSuccessMessage("Task deleted successfully.");
      await refreshTasks();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const handleQuickStatusChange = async (task, status) => {
    setError("");
    setSuccessMessage("");

    const previousTasks = tasks;
    setTasks((current) =>
      current.map((item) =>
        item._id === task._id ? { ...item, status } : item,
      ),
    );

    try {
      await updateTaskStatus(token, task._id, status);
      setSuccessMessage("Task status updated.");
      await refreshTasks();
    } catch (updateError) {
      setTasks(previousTasks);
      setError(updateError.message);
    }
  };

  const handleBoardDrop = async (task, status) => {
    setError("");
    setSuccessMessage("");

    const previousTasks = tasks;
    setTasks((current) =>
      current.map((item) =>
        item._id === task._id ? { ...item, status } : item,
      ),
    );

    try {
      await updateTaskStatus(token, task._id, status);
      setSuccessMessage(
        `Moved "${task.title}" to ${status.replace("_", " ")}.`,
      );
      await refreshTasks();
    } catch (updateError) {
      setTasks(previousTasks);
      setError(updateError.message);
    }
  };

  const handleCreateSubtask = async (taskId, title) => {
    setError("");
    setSuccessMessage("");
    setSubtaskActionKey(`create:${taskId}`);

    try {
      await createSubtask(token, taskId, title);
      setSuccessMessage("Subtask added.");
      await refreshTasks();
    } catch (subtaskError) {
      setError(subtaskError.message);
    } finally {
      setSubtaskActionKey("");
    }
  };

  const handleToggleSubtask = async (taskId, subtaskId, payload) => {
    setError("");
    setSuccessMessage("");
    setSubtaskActionKey(`toggle:${subtaskId}`);

    try {
      await updateSubtask(token, taskId, subtaskId, payload);
      setSuccessMessage("Subtask updated.");
      await refreshTasks();
    } catch (subtaskError) {
      setError(subtaskError.message);
    } finally {
      setSubtaskActionKey("");
    }
  };

  const handleDeleteSubtask = async (taskId, subtaskId) => {
    setError("");
    setSuccessMessage("");
    setSubtaskActionKey(`delete:${subtaskId}`);

    try {
      await deleteSubtask(token, taskId, subtaskId);
      setSuccessMessage("Subtask removed.");
      await refreshTasks();
    } catch (subtaskError) {
      setError(subtaskError.message);
    } finally {
      setSubtaskActionKey("");
    }
  };

  return (
    <main className="page-shell">
      <Navbar />

      <div className="dashboard-shell dashboard-shell-compact">
        <section className="panel workspace-summary-bar">
          <div className="workspace-summary-main">
            <p className="eyebrow compact-eyebrow">Private workspace</p>
            <div className="workspace-summary-title-row">
              <h1>{workspaceTitle}</h1>
              <span className="workspace-summary-badge">
                {isLoading
                  ? "Refreshing tasks"
                  : `${totalVisibleTasks} matching tasks`}
              </span>
            </div>
            <p className="workspace-summary-text">
              Compact planning with more room for the list, board, and
              subtasks.
            </p>
          </div>

          <div className="workspace-summary-aside">
            <div
              aria-label="Task view"
              className="workspace-toolbar-actions"
              role="tablist">
              <button
                aria-selected={viewMode === "list"}
                className={
                  viewMode === "list" ? "primary-button" : "ghost-button"
                }
                onClick={() => setViewMode("list")}
                role="tab"
                type="button">
                List
              </button>

              <button
                aria-selected={viewMode === "board"}
                className={
                  viewMode === "board" ? "primary-button" : "ghost-button"
                }
                onClick={() => setViewMode("board")}
                role="tab"
                type="button">
                Board
              </button>
            </div>

            <div className="workspace-summary-stats">
              <div className="summary-chip">
                <span className="summary-chip-label">Todo</span>
                <strong>{taskSummary.todo}</strong>
              </div>

              <div className="summary-chip">
                <span className="summary-chip-label">In progress</span>
                <strong>{taskSummary.in_progress}</strong>
              </div>

              <div className="summary-chip">
                <span className="summary-chip-label">Done</span>
                <strong>{taskSummary.completed}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="workspace-grid workspace-grid-compact">
          <div className="dashboard-main panel workspace-panel">
            <div className="workspace-header">
              <div className="workspace-overview">
                <div>
                  <p className="eyebrow compact-eyebrow">Task overview</p>
                  <h2>{viewMode === "board" ? "Kanban board" : "Task list"}</h2>
                </div>
                <p className="workspace-overview-copy">
                  Filters stay close to the work so you can scan and act
                  faster.
                </p>
              </div>

              <TaskFilters
                filters={filters}
                isLoading={isLoading}
                onChange={handleFilterChange}
                onReset={() => setFilters({ ...defaultFilters })}
              />

              <div className="workspace-status-area">
                {error ? (
                  <p className="error-banner workspace-banner">{error}</p>
                ) : null}

                {successMessage ? (
                  <p className="success-banner workspace-banner">
                    {successMessage}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="workspace-content">
              {viewMode === "board" ? (
                <KanbanBoard
                  isLoading={isLoading}
                  onStatusDrop={handleBoardDrop}
                  tasks={tasks}
                />
              ) : (
                <TaskList
                  isLoading={isLoading}
                  onCreateSubtask={handleCreateSubtask}
                  onDelete={handleDelete}
                  onDeleteSubtask={handleDeleteSubtask}
                  onEdit={setEditingTask}
                  onQuickStatusChange={handleQuickStatusChange}
                  onToggleSubtask={handleToggleSubtask}
                  subtaskActionKey={subtaskActionKey}
                  tasks={tasks}
                />
              )}
            </div>

            <Pagination
              onPageChange={(page) =>
                setFilters((current) => ({ ...current, page }))
              }
              pagination={pagination}
            />
          </div>

          <aside className="dashboard-sidebar">
            <TaskForm
              initialValues={editingTask}
              isSubmitting={isSubmitting}
              onCancel={() => setEditingTask(null)}
              onSubmit={handleTaskSubmit}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

export default DashboardPage;
