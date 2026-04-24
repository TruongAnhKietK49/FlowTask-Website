import { useState } from 'react';

function InviteAcceptancePanel({ onAcceptInvite }) {
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onAcceptInvite(token.trim());
      setToken('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel invite-acceptance-panel">
      <div className="project-panel-heading">
        <div>
          <p className="eyebrow compact-eyebrow">Join workspace</p>
          <h2>Accept invite</h2>
        </div>
      </div>

      <form className="task-form" onSubmit={handleSubmit}>
        <label>
          Invite code
          <input
            name="inviteToken"
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste invite token here"
            required
            value={token}
          />
        </label>

        <button className="primary-button" disabled={isSubmitting || !token.trim()} type="submit">
          {isSubmitting ? 'Joining...' : 'Accept invite'}
        </button>
      </form>
    </section>
  );
}

export default InviteAcceptancePanel;
