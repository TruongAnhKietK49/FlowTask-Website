import { useState } from 'react';
import { Link } from 'react-router-dom';
import InvitationInbox from './InvitationInbox';
import { useAuth } from '../hooks/useAuth';

function Navbar() {
  const {
    acceptInvitation,
    invitationCount,
    invitations,
    logout,
    refreshInvitations,
    rejectInvitation,
    user,
  } = useAuth();
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isRefreshingInbox, setIsRefreshingInbox] = useState(false);

  const handleOpenInbox = async () => {
    setIsRefreshingInbox(true);
    setIsInboxOpen(true);

    try {
      await refreshInvitations();
    } finally {
      setIsRefreshingInbox(false);
    }
  };

  return (
    <header className="topbar">
      <div>
        <Link className="brand" to="/dashboard">
          FlowTask
        </Link>
        <p className="topbar-subtitle">Project-focused task command center for shared work.</p>
      </div>
      <div className="topbar-actions">
        <InvitationInbox
          invitationCount={invitationCount}
          invitations={invitations}
          isOpen={isInboxOpen}
          isRefreshing={isRefreshingInbox}
          onAccept={acceptInvitation}
          onClose={() => setIsInboxOpen(false)}
          onOpen={handleOpenInbox}
          onReject={rejectInvitation}
        />
        <span className="user-badge">{user?.name}</span>
        <button className="ghost-button" onClick={logout} type="button">
          Sign out
        </button>
      </div>
    </header>
  );
}

export default Navbar;
