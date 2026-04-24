import { useEffect, useState } from 'react';

const emptyValues = {
  email: '',
  role: 'member',
};

function InviteMemberModal({ isOpen, isSubmitting, onClose, onSubmit, projectName }) {
  const [formValues, setFormValues] = useState(emptyValues);

  useEffect(() => {
    if (!isOpen) {
      setFormValues(emptyValues);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(formValues);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-modal="true"
        className="panel modal-card invite-member-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog">
        <div className="project-panel-heading">
          <div>
            <p className="eyebrow compact-eyebrow">Collaboration</p>
            <h2>Invite member</h2>
            <p className="info-text">
              Send a project invitation for {projectName || 'this workspace'}.
            </p>
          </div>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              autoFocus
              name="email"
              onChange={handleChange}
              placeholder="teammate@example.com"
              required
              type="email"
              value={formValues.email}
            />
          </label>

          <label>
            Role
            <select name="role" onChange={handleChange} value={formValues.role}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <div className="form-actions modal-actions">
            <button
              className="ghost-button"
              disabled={isSubmitting}
              onClick={onClose}
              type="button">
              Cancel
            </button>

            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Sending...' : 'Send invite'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default InviteMemberModal;
