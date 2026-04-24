/* eslint-disable no-unused-vars */
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getTaskDueState } from "../utils/taskDueState";

const columns = [
  { id: "todo", title: "Todo", subtitle: "Planned and ready to start" },
  {
    id: "in_progress",
    title: "In Progress",
    subtitle: "Active work in motion",
  },
  { id: "completed", title: "Done", subtitle: "Shipped and wrapped up" },
];

const collisionDetectionStrategy = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length ? pointerCollisions : closestCorners(args);
};

const formatDate = (value) => {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
};

function KanbanCard({ task, isDragging = false, style }) {
  const dueState = getTaskDueState(task);
  const completedSubtasks = task.completedSubtasksCount || 0;
  const subtasksCount = task.subtasksCount || 0;
  const visibleTags = task.tags?.slice(0, 2) || [];
  const assigneeLabel = !task.assignedTo
    ? "Unassigned"
    : typeof task.assignedTo === "object"
      ? task.assignedTo.name || task.assignedTo.email || "Assigned"
      : "Assigned";

  return (
    <article
      className={`kanban-card${isDragging ? " kanban-card-overlay" : ""}${
        dueState.kind !== "none" ? ` kanban-card-${dueState.kind}` : ""
      }`}
      style={style}>
      <div className="kanban-card-header">
        <span className={`pill pill-priority-${task.priority}`}>
          {task.priority}
        </span>

        {dueState.label ? (
          <span className={`pill pill-alert-${dueState.kind}`}>
            {dueState.label}
          </span>
        ) : null}
      </div>

      <h3>{task.title}</h3>

      <p className="kanban-card-description">
        {task.description || "No description provided."}
      </p>

      <div className="kanban-card-meta">
        <span className="pill pill-neutral">{formatDate(task.dueDate)}</span>
        <span className="pill pill-neutral">Assignee: {assigneeLabel}</span>
        <span className="pill pill-neutral">
          {completedSubtasks}/{subtasksCount} subtasks
        </span>
      </div>

      <div className="kanban-card-footer">
        <div className="kanban-card-tags">
          {visibleTags.length ? (
            visibleTags.map((tag) => <span key={tag}>#{tag}</span>)
          ) : (
            <span>#untagged</span>
          )}
        </div>
      </div>
    </article>
  );
}

function SortableTaskCard({ task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    data: {
      type: "task",
      task,
      status: task.status,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      className={`sortable-task-card${
        isDragging ? " sortable-task-card-dragging" : ""
      }`}
      style={style}
      {...attributes}
      {...listeners}>
      <KanbanCard task={task} />
    </div>
  );
}

function KanbanColumn({ column, tasks }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      status: column.id,
    },
  });

  return (
    <section
      className={`kanban-column${isOver ? " kanban-column-active" : ""}`}>
      <div className="kanban-column-header">
        <div>
          <h2>{column.title}</h2>
          <p>{column.subtitle}</p>
        </div>
        <span className="kanban-column-count">{tasks.length}</span>
      </div>

      <div ref={setNodeRef} className="kanban-column-body">
        <SortableContext
          items={tasks.map((task) => task._id)}
          strategy={verticalListSortingStrategy}>
          {tasks.length ? (
            tasks.map((task) => (
              <SortableTaskCard key={task._id} task={task} />
            ))
          ) : (
            <div className="kanban-empty">Drop a task here</div>
          )}
        </SortableContext>
      </div>
    </section>
  );
}

function KanbanBoard({ tasks, isLoading, onStatusDrop }) {
  const [activeTask, setActiveTask] = useState(null);
  const [activeTaskRect, setActiveTaskRect] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 6,
      },
    }),
  );

  const groupedTasks = useMemo(
    () =>
      columns.reduce((accumulator, column) => {
        accumulator[column.id] = tasks.filter(
          (task) => task.status === column.id,
        );
        return accumulator;
      }, {}),
    [tasks],
  );

  const clearActiveDrag = () => {
    setActiveTask(null);
    setActiveTaskRect(null);
  };

  const handleDragStart = (event) => {
    setActiveTask(event.active.data.current?.task || null);

    const initialRect = event.active.rect.current.initial;
    setActiveTaskRect(
      initialRect
        ? {
            width: initialRect.width,
            height: initialRect.height,
          }
        : null,
    );
  };

  const handleDragCancel = () => {
    clearActiveDrag();
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    clearActiveDrag();

    if (!over) {
      return;
    }

    const sourceTask = active.data.current?.task;
    const sourceStatus = active.data.current?.status;
    const targetType = over.data.current?.type;
    const targetStatus =
      targetType === "column"
        ? over.data.current.status
        : over.data.current?.task?.status;

    if (!sourceTask || !targetStatus || sourceStatus === targetStatus) {
      return;
    }

    await onStatusDrop(sourceTask, targetStatus);
  };

  if (isLoading) {
    return <section className="panel">Loading board...</section>;
  }

  return (
    <section className="kanban-shell">
      <DndContext
        collisionDetection={collisionDetectionStrategy}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}>
        <div className="kanban-board">
          {columns.map((column) => (
            <KanbanColumn
              column={column}
              key={column.id}
              tasks={groupedTasks[column.id] || []}
            />
          ))}
        </div>

        {typeof document !== "undefined"
          ? createPortal(
              <DragOverlay adjustScale={false} dropAnimation={null}>
                {activeTask ? (
                  <div className="kanban-drag-overlay">
                    <KanbanCard
                      isDragging
                      style={activeTaskRect || undefined}
                      task={activeTask}
                    />
                  </div>
                ) : null}
              </DragOverlay>,
              document.body,
            )
          : null}
      </DndContext>
    </section>
  );
}

export default KanbanBoard;
