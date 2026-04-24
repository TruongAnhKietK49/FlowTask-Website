/* eslint-disable no-unused-vars */
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  createProject,
  deleteProject,
  inviteProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
} from "../api/projectApi";
import KanbanBoard from "../components/KanbanBoard";
import CreateTaskModal from "../components/CreateTaskModal";
import FloatingActionButton from "../components/FloatingActionButton";
import Navbar from "../components/Navbar";
import Pagination from "../components/Pagination";
import ProjectForm from "../components/ProjectForm";
import ProjectMembersPanel from "../components/ProjectMembersPanel";
import Sidebar from "../components/Sidebar";
import TaskFilters from "../components/TaskFilters";
import TaskList from "../components/TaskList";
import { getSocket } from "../lib/socket";
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
  assignedTo: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  limit: "10",
  page: 1,
};

function DashboardPage() {
  const {
    token,
    user,
    projects,
    ownedProjects,
    contributedProjects,
    refreshInvitations,
    refreshProjects,
    selectedProject,
    selectedProjectId,
    setSelectedProjectId,
  } = useAuth();
  const [filters, setFilters] = useState(defaultFilters);
  const [viewMode, setViewMode] = useState("list");
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [subtaskActionKey, setSubtaskActionKey] = useState("");
  const activeProjectRoomRef = useRef(null);

  const deferredSearch = useDeferredValue(filters.search);
  const activeProject = selectedProject;
  const projectMembers = activeProject?.members || [];

  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      setPagination(null);
      setIsLoading(false);
      return;
    }

    const fetchTasks = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await getTasks(token, {
          ...filters,
          project: selectedProjectId,
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
  }, [deferredSearch, filters, selectedProjectId, token]);

  useEffect(() => {
    setEditingTask(null);
    setIsTaskModalOpen(false);
    setIsProjectSettingsOpen(false);
    setFilters((current) => ({
      ...current,
      page: 1,
    }));
  }, [selectedProjectId]);

  const totalVisibleTasks = pagination?.total ?? tasks.length;
  const projectRole = activeProject?.currentUserRole || "member";
  const memberCount = activeProject?.members?.length || 0;

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

  const handleSelectProject = (projectId) => {
    setError("");
    setSuccessMessage("");
    setSelectedProjectId(projectId || null);
  };

  const refreshTasks = async () => {
    if (!selectedProjectId) {
      setTasks([]);
      setPagination(null);
      return;
    }

    const response = await getTasks(token, {
      ...filters,
      project: selectedProjectId,
      search: deferredSearch,
    });
    setTasks(response.data);
    setPagination(response.pagination);
  };

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      activeProjectRoomRef.current = null;
      return undefined;
    }

    const joinProjectRoom = (projectId) => {
      if (!projectId) {
        return;
      }

      socket.emit("project:join", projectId, (response) => {
        if (!response?.ok) {
          setError(response?.message || "Unable to join project realtime room.");
        }
      });
    };

    const previousProjectId = activeProjectRoomRef.current;

    if (previousProjectId && previousProjectId !== selectedProjectId) {
      socket.emit("project:leave", previousProjectId);
    }

    if (!selectedProjectId) {
      activeProjectRoomRef.current = null;
      return undefined;
    }

    const handleSocketConnect = () => {
      joinProjectRoom(selectedProjectId);
    };

    socket.on("connect", handleSocketConnect);
    joinProjectRoom(selectedProjectId);
    activeProjectRoomRef.current = selectedProjectId;

    return () => {
      socket.off("connect", handleSocketConnect);
      socket.emit("project:leave", selectedProjectId);

      if (activeProjectRoomRef.current === selectedProjectId) {
        activeProjectRoomRef.current = null;
      }
    };
  }, [selectedProjectId, token]);

  const openCreateTaskModal = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setEditingTask(null);
    setIsTaskModalOpen(false);
  };

  const handleTaskSubmit = async (formValues, resetForm) => {
    if (!selectedProjectId) {
      setError("Select a project before creating tasks.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    const payload = {
      ...formValues,
      project: selectedProjectId,
      assignedTo: formValues.assignedTo || null,
      dueDate: formValues.dueDate || null,
      tags: formValues.tags,
    };

    try {
      if (editingTask) {
        await updateTask(token, editingTask._id, payload);
        setSuccessMessage("Task updated successfully.");
      } else {
        await createTask(token, payload);
        setSuccessMessage("Task created successfully.");
        resetForm();
      }

      await refreshTasks();
      closeTaskModal();
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

  const handleProjectCreate = async (formValues, resetForm) => {
    setIsCreatingProject(true);
    setError("");
    setSuccessMessage("");

    try {
      const project = await createProject(token, formValues);
      await refreshProjects(project._id);
      setIsProjectFormOpen(false);
      setSuccessMessage("Project created successfully.");
      resetForm();
    } catch (createError) {
      setError(createError.message);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleInviteMember = async (payload) => {
    if (!activeProject?._id) {
      return null;
    }

    setError("");
    setSuccessMessage("");

    try {
      const response = await inviteProjectMember(token, activeProject._id, payload);
      await refreshProjects(activeProject._id);
      setSuccessMessage("Invitation created successfully.");
      return response;
    } catch (inviteError) {
      setError(inviteError.message);
      throw inviteError;
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!activeProject?._id) {
      return;
    }

    const confirmed = window.confirm("Remove this member from the project?");

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      await removeProjectMember(token, activeProject._id, userId);
      await refreshProjects(activeProject._id);
      setSuccessMessage("Member removed from the project.");
      await refreshTasks();
    } catch (removeError) {
      setError(removeError.message);
      throw removeError;
    }
  };

  const handleUpdateMemberRole = async (userId, role) => {
    if (!activeProject?._id) {
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      await updateProjectMemberRole(token, activeProject._id, userId, role);
      await refreshProjects(activeProject._id);
      setSuccessMessage("Member role updated.");
    } catch (updateError) {
      setError(updateError.message);
      throw updateError;
    }
  };

  const handleDeleteProject = async () => {
    if (!activeProject?._id) {
      return;
    }

    const confirmed = window.confirm(
      `Delete project "${activeProject.name}"? This also deletes its tasks.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingProject(true);
    setError("");
    setSuccessMessage("");

    try {
      await deleteProject(token, activeProject._id);
      await refreshProjects();
      setTasks([]);
      setPagination(null);
      setIsProjectSettingsOpen(false);
      setSuccessMessage("Project deleted successfully.");
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setIsDeletingProject(false);
    }
  };

  useEffect(() => {
    const socket = getSocket();

    if (!socket || !token || !user?._id) {
      return undefined;
    }

    const handleRealtimeError = (error) => {
      if (typeof error === "string") {
        setError(error);
        return;
      }

      if (error?.message) {
        setError(error.message);
      }
    };

    const refreshCurrentProjectTasks = async (projectId) => {
      if (!selectedProjectId || projectId !== selectedProjectId) {
        return;
      }

      try {
        await refreshTasks();
      } catch (refreshError) {
        setError(refreshError.message);
      }
    };

    const handleTaskEvent = async (payload) => {
      await refreshCurrentProjectTasks(payload?.projectId);
    };

    const handleProjectUpdated = async (payload) => {
      try {
        await refreshProjects(selectedProjectId || payload?.projectId);

        if (payload?.projectId === selectedProjectId) {
          await refreshTasks();
        }
      } catch (refreshError) {
        setError(refreshError.message);
      }
    };

    const handleProjectDeleted = async (payload) => {
      const deletedActiveProject = payload?.projectId === selectedProjectId;

      try {
        await refreshProjects();

        if (deletedActiveProject) {
          setTasks([]);
          setPagination(null);
          setEditingTask(null);
          setIsTaskModalOpen(false);
          setIsProjectSettingsOpen(false);
          setSuccessMessage("This project was deleted.");
        }
      } catch (refreshError) {
        setError(refreshError.message);
      }
    };

    const handleMemberInvited = async (payload) => {
      try {
        await refreshInvitations();

        if (payload?.projectId === selectedProjectId) {
          await refreshProjects(selectedProjectId);
        }
      } catch (refreshError) {
        setError(refreshError.message);
      }
    };

    const handleMemberAdded = async (payload) => {
      try {
        await refreshProjects(selectedProjectId || payload?.projectId);

        if (payload?.userId === user._id) {
          await refreshInvitations();
        }

        if (payload?.projectId === selectedProjectId) {
          await refreshTasks();
        }
      } catch (refreshError) {
        setError(refreshError.message);
      }
    };

    const handleMemberRemoved = async (payload) => {
      const removedCurrentUser = payload?.userId === user._id;
      const removedFromActiveProject = payload?.projectId === selectedProjectId;

      try {
        await refreshProjects();

        if (removedCurrentUser) {
          await refreshInvitations();
        }

        if (removedCurrentUser && removedFromActiveProject) {
          setTasks([]);
          setPagination(null);
          setEditingTask(null);
          setIsTaskModalOpen(false);
          setIsProjectSettingsOpen(false);
          setSuccessMessage("You were removed from this project.");
          return;
        }

        if (removedFromActiveProject) {
          await refreshTasks();
        }
      } catch (refreshError) {
        setError(refreshError.message);
      }
    };

    socket.on("connect_error", handleRealtimeError);
    socket.on("task:created", handleTaskEvent);
    socket.on("task:updated", handleTaskEvent);
    socket.on("task:deleted", handleTaskEvent);
    socket.on("task:statusChanged", handleTaskEvent);
    socket.on("task:assigned", handleTaskEvent);
    socket.on("subtask:created", handleTaskEvent);
    socket.on("subtask:updated", handleTaskEvent);
    socket.on("subtask:deleted", handleTaskEvent);
    socket.on("project:updated", handleProjectUpdated);
    socket.on("project:deleted", handleProjectDeleted);
    socket.on("member:invited", handleMemberInvited);
    socket.on("member:added", handleMemberAdded);
    socket.on("member:removed", handleMemberRemoved);

    return () => {
      socket.off("connect_error", handleRealtimeError);
      socket.off("task:created", handleTaskEvent);
      socket.off("task:updated", handleTaskEvent);
      socket.off("task:deleted", handleTaskEvent);
      socket.off("task:statusChanged", handleTaskEvent);
      socket.off("task:assigned", handleTaskEvent);
      socket.off("subtask:created", handleTaskEvent);
      socket.off("subtask:updated", handleTaskEvent);
      socket.off("subtask:deleted", handleTaskEvent);
      socket.off("project:updated", handleProjectUpdated);
      socket.off("project:deleted", handleProjectDeleted);
      socket.off("member:invited", handleMemberInvited);
      socket.off("member:added", handleMemberAdded);
      socket.off("member:removed", handleMemberRemoved);
    };
  }, [refreshInvitations, refreshProjects, refreshTasks, selectedProjectId, token, user?._id]);

  return (
    <main className="page-shell">
      <Navbar />

      <div className="dashboard-layout">
        <Sidebar
          contributedProjects={contributedProjects}
          isCollapsed={isSidebarCollapsed}
          onCreateProject={() => setIsProjectFormOpen(true)}
          onSelectProject={handleSelectProject}
          onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
          ownedProjects={ownedProjects}
          selectedProjectId={selectedProjectId}
        />

        <section className="dashboard-content-column">
          <section className="panel project-main-header">
            <div className="project-main-header-copy">
              <p className="eyebrow compact-eyebrow">Selected project</p>
              <div className="project-main-title-row">
                <h1>{activeProject?.name || "Choose a project"}</h1>
                {activeProject ? (
                  <span className="project-main-task-count">
                    {isLoading ? "Refreshing..." : `${totalVisibleTasks} tasks`}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="project-main-header-actions">
              {activeProject ? (
                <div className="project-main-meta">
                  <span className="pill pill-neutral">{projectRole}</span>
                  <span className="pill pill-neutral">{memberCount} members</span>
                  <span
                    className={`pill ${
                      activeProject.status === "archived"
                        ? "pill-priority-medium"
                        : "pill-priority-low"
                    }`}>
                    {activeProject.status}
                  </span>
                </div>
              ) : null}

              <div className="project-main-actions">
                {activeProject ? (
                  <button
                    aria-label="Project settings"
                    className="ghost-button icon-only-button"
                    onClick={() => setIsProjectSettingsOpen(true)}
                    title="Project settings"
                    type="button">
                    <span aria-hidden="true" className="icon-button-svg">
                      <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
                        <path
                          d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                        <path
                          d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h.08a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h.08a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.08a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1V15Z"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.3"
                        />
                      </svg>
                    </span>
                  </button>
                ) : null}

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
              </div>
            </div>
          </section>

          <section className="panel task-surface-panel">
            <div className="workspace-header compact-workspace-header">
              {activeProject ? (
                <TaskFilters
                  filters={filters}
                  isLoading={isLoading}
                  onChange={handleFilterChange}
                  onReset={() => setFilters({ ...defaultFilters })}
                  projectMembers={projectMembers}
                />
              ) : null}

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

            <div className="workspace-content task-surface-content">
              {!activeProject ? (
                <section className="panel empty-state compact-empty-state">
                  <h2>No project selected</h2>
                  <p>
                    Pick a project from the left sidebar to focus your tasks,
                    board, filters, members, and settings in one workspace.
                  </p>
                </section>
              ) : viewMode === "board" ? (
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
                  onEdit={openEditTaskModal}
                  onQuickStatusChange={handleQuickStatusChange}
                  onToggleSubtask={handleToggleSubtask}
                  subtaskActionKey={subtaskActionKey}
                  tasks={tasks}
                />
              )}
            </div>

            {activeProject ? (
              <Pagination
                onPageChange={(page) =>
                  setFilters((current) => ({ ...current, page }))
                }
                pagination={pagination}
              />
            ) : null}
          </section>
        </section>
      </div>

      <ProjectForm
        isOpen={isProjectFormOpen || !projects.length}
        isSubmitting={isCreatingProject}
        onCancel={() => setIsProjectFormOpen(false)}
        onSubmit={handleProjectCreate}
      />

      <CreateTaskModal
        initialValues={editingTask}
        isDisabled={!activeProject}
        isOpen={isTaskModalOpen}
        isSubmitting={isSubmitting}
        onClose={closeTaskModal}
        onSubmit={handleTaskSubmit}
        projectMembers={projectMembers}
        selectedProject={activeProject}
      />

      {activeProject ? (
        <ProjectMembersPanel
          currentUser={user}
          isDeletingProject={isDeletingProject}
          isOpen={isProjectSettingsOpen}
          onClose={() => setIsProjectSettingsOpen(false)}
          onDeleteProject={handleDeleteProject}
          onInviteMember={handleInviteMember}
          onRemoveMember={handleRemoveMember}
          onUpdateMemberRole={handleUpdateMemberRole}
          project={activeProject}
        />
      ) : null}

      <FloatingActionButton
        disabled={!activeProject}
        onClick={openCreateTaskModal}
      />
    </main>
  );
}

export default DashboardPage;
