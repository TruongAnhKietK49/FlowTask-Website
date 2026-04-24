import { useState } from 'react';

const emptyProjectForm = {
  name: '',
  description: '',
  color: '#2563eb',
};

function ProjectForm({ isOpen, isSubmitting, onCancel, onSubmit }) {
  const [formValues, setFormValues] = useState(emptyProjectForm);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(formValues, () => setFormValues(emptyProjectForm));
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onCancel} role="presentation">
      <section
        aria-modal="true"
        className="panel modal-card accent-panel project-form-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog">
        <div className="project-form-heading">
          <p className="eyebrow compact-eyebrow">Workspace setup</p>
          <h2>Create project</h2>
          <p className="project-form-copy">
            Start with a compact workspace, then invite teammates through the API.
          </p>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <label>
            Project name
            <input
              autoFocus
              name="name"
              onChange={handleChange}
              placeholder="Website relaunch"
              required
              value={formValues.name}
            />
          </label>

          <label>
            Description
            <textarea
              name="description"
              onChange={handleChange}
              placeholder="Shared delivery space for tasks, blockers, and launch steps..."
              rows="3"
              value={formValues.description}
            />
          </label>

          <label>
            Color
            <input
              name="color"
              onChange={handleChange}
              type="color"
              value={formValues.color}
            />
          </label>

          <div className="form-actions">
            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Creating...' : 'Create project'}
            </button>

            <button className="ghost-button" onClick={onCancel} type="button">
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ProjectForm;
