import TaskForm from "./TaskForm";

function CreateTaskModal({
  initialValues,
  isDisabled,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
  projectMembers,
  selectedProject,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-modal="true"
        className="panel modal-card create-task-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog">
        <TaskForm
          embedded
          initialValues={initialValues}
          isDisabled={isDisabled}
          isSubmitting={isSubmitting}
          onCancel={onClose}
          onSubmit={onSubmit}
          projectMembers={projectMembers}
          selectedProject={selectedProject}
        />
      </section>
    </div>
  );
}

export default CreateTaskModal;
