import { useEffect, useRef, useState } from 'react';

const formatDateTime = (value) => {
  if (!value) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
};

const getInviterLabel = (invitation) =>
  invitation.invitedBy?.name || invitation.invitedBy?.email || 'A project admin';

function InvitationInbox({
  invitations,
  invitationCount,
  isOpen,
  isRefreshing,
  onAccept,
  onClose,
  onOpen,
  onReject,
}) {
  const [activeInviteId, setActiveInviteId] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveInviteId('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen, onClose]);

  const handleAction = async (inviteId, action) => {
    setActiveInviteId(inviteId);

    try {
      await action(inviteId);
    } finally {
      setActiveInviteId('');
    }
  };

  return (
    <div className="notification-popover-container" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-label="Project invitations"
        className="ghost-button notification-button"
        onClick={isOpen ? onClose : onOpen}
        title="Project invitations"
        type="button">
        <span className="notification-button-icon" aria-hidden="true">
          <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
            <path
              d="M15 17H9M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <path
              d="M13.73 21a2 2 0 01-3.46 0"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </span>
        {invitationCount ? (
          <span className="notification-badge">{invitationCount}</span>
        ) : null}
      </button>

      {isOpen ? (
        <section className="panel invitation-popover" role="dialog">
          <div className="project-panel-heading invitation-popover-heading">
            <div>
              <p className="eyebrow compact-eyebrow">Notifications</p>
              <h2>Project invitations</h2>
            </div>

            <button className="ghost-button" onClick={onClose} type="button">
              Close
            </button>
          </div>

          {isRefreshing ? (
            <p className="info-text">Refreshing invitations...</p>
          ) : invitations.length ? (
            <div className="invitation-inbox-list">
              {invitations.map((invitation) => {
                const isActing = activeInviteId === invitation._id;

                return (
                  <article className="invitation-inbox-card" key={invitation._id}>
                    <div className="invitation-inbox-main">
                      <div className="invitation-inbox-title-row">
                        <strong>{invitation.project?.name || 'Project invitation'}</strong>
                        <span className="pill pill-neutral">{invitation.role}</span>
                      </div>

                      <p className="info-text">
                        Invited by {getInviterLabel(invitation)}
                      </p>
                      <p className="info-text">
                        Sent {formatDateTime(invitation.createdAt)} · Expires{' '}
                        {formatDateTime(invitation.expiresAt)}
                      </p>
                    </div>

                    <div className="member-card-actions">
                      <button
                        className="ghost-button"
                        disabled={isActing}
                        onClick={() => handleAction(invitation._id, onReject)}
                        type="button">
                        {isActing ? 'Working...' : 'Reject'}
                      </button>

                      <button
                        className="primary-button"
                        disabled={isActing}
                        onClick={() => handleAction(invitation._id, onAccept)}
                        type="button">
                        {isActing ? 'Working...' : 'Accept'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <section className="empty-state invitation-empty-state">
              <h2>No pending invitations</h2>
              <p>You are up to date. New project invites will appear here.</p>
            </section>
          )}
        </section>
      ) : null}
    </div>
  );
}

export default InvitationInbox;
