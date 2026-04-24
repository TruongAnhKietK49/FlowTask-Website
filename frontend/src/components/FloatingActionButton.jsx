function FloatingActionButton({ disabled, onClick }) {
  return (
    <button
      aria-label="Create task"
      className="floating-action-button"
      disabled={disabled}
      onClick={onClick}
      title={disabled ? "Select a project first" : "Create task"}
      type="button">
      <span aria-hidden="true">+</span>
    </button>
  );
}

export default FloatingActionButton;
