/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useRef, useState } from 'react';
import InviteMemberModal from './InviteMemberModal';

const formatDate = (value) => {
  if (!value) {
    return 'No expiry';
  }

  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
};

const getMemberUser = (member) => {
  if (!member?.user) {
    return null;
  }

  return typeof member.user === 'object'
    ? member.user
    : { _id: member.user, name: '', email: '' };
};

const getInitials = (value) => {
  if (!value) {
    return 'U';
  }

  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

function SettingsMenu({ children, isOpen, onClose, onToggle }) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen, onClose]);

  return (
    <div className="settings-menu" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        className="ghost-button icon-only-button"
        onClick={onToggle}
        title="Member settings"
        type="button">
        <span aria-hidden="true" className="icon-button-svg">
          <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
            <circle cx="5" cy="12" fill="currentColor" r="1.8" />
            <circle cx="12" cy="12" fill="currentColor" r="1.8" />
            <circle cx="19" cy="12" fill="currentColor" r="1.8" />
          </svg>
        </span>
      </button>

      {isOpen ? <div className="settings-dropdown">{children}</div> : null}
    </div>
  );
}

function ProjectMembersPanel({
  currentUser,
  isDeletingProject,
  isOpen,
  onClose,
  onDeleteProject,
  onInviteMember,
  onRemoveMember,
  onUpdateMemberRole,
  project,
}) {
  const [activeMemberMenuId, setActiveMemberMenuId] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [memberActionKey, setMemberActionKey] = useState('');
  const pendingInvitations = useMemo(
    () => (project?.invitations || []).filter((invitation) => invitation.status === 'pending'),
    [project?.invitations]
  );
  const projectId = project?._id;
  const memberCount = project?.members?.length || 0;
  const pendingCount = pendingInvitations.length;

  useEffect(() => {
    setActiveMemberMenuId('');
    setIsInviteModalOpen(false);
    setMemberActionKey('');
  }, [projectId, isOpen]);

  if (!project || !isOpen) {
    return null;
  }

  const canManageMembers = Boolean(project.canManageMembers);
  const canDeleteProject = Boolean(project.canDeleteProject);

  const handleInviteSubmit = async (payload) => {
    setIsInviting(true);

    try {
      await onInviteMember(payload);
      setIsInviteModalOpen(false);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    setMemberActionKey(`remove:${userId}`);

    try {
      await onRemoveMember(userId);
      setActiveMemberMenuId('');
    } finally {
      setMemberActionKey('');
    }
  };

  const handleUpdateRole = async (userId, role) => {
    setMemberActionKey(`role:${userId}`);

    try {
      await onUpdateMemberRole(userId, role);
      setActiveMemberMenuId('');
    } finally {
      setMemberActionKey('');
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} role="presentation">
        <section
          aria-modal="true"
          className="panel modal-card project-settings-modal"
          onClick={(event) => event.stopPropagation()}
          role="dialog">
          <div className="project-panel-heading project-settings-header project-settings-header-compact">
            <div>
              <p className="eyebrow compact-eyebrow">Project settings</p>
              <h2>{project.name}</h2>
              <p className="info-text">
                Collaboration, access, and project actions are grouped here.
              </p>
            </div>

            <div className="member-panel-toolbar">
              <span className="pill pill-neutral">{project.currentUserRole}</span>
              <button className="ghost-button" onClick={onClose} type="button">
                Close
              </button>
            </div>
          </div>

          <div className="project-settings-layout">
            <aside className="project-settings-sidebar">
              <section className="project-settings-overview-card">
                <div className="project-settings-overview-head">
                  <span className="project-settings-icon-badge" aria-hidden="true">
                    #
                  </span>
                  <div>
                    <p className="eyebrow compact-eyebrow">Workspace</p>
                    <h3>{project.name}</h3>
                  </div>
                </div>

                <p className="info-text">
                  You are managing this workspace as {project.currentUserRole}. Keep access tight
                  and invitations lightweight.
                </p>

                <div className="project-settings-metrics">
                  <article className="project-settings-metric">
                    <span>Members</span>
                    <strong>{memberCount}</strong>
                  </article>
                  <article className="project-settings-metric">
                    <span>Pending</span>
                    <strong>{pendingCount}</strong>
                  </article>
                  <article className="project-settings-metric">
                    <span>Status</span>
                    <strong>{project.status || 'active'}</strong>
                  </article>
                </div>

                <div className="project-settings-sidebar-actions">
                  {canManageMembers ? (
                    <button
                      className="primary-button"
                      onClick={() => setIsInviteModalOpen(true)}
                      type="button">
                      Invite member
                    </button>
                  ) : null}

                  <button className="ghost-button" onClick={onClose} type="button">
                    Back to workspace
                  </button>
                </div>
              </section>

              {canDeleteProject ? (
                <section className="project-danger-zone project-danger-zone-compact">
                  <div>
                    <p className="eyebrow compact-eyebrow">Danger zone</p>
                    <h3>Delete project</h3>
                    <p className="info-text">
                      Permanently removes this project and every related task.
                    </p>
                  </div>

                  <button
                    className="danger-button"
                    disabled={isDeletingProject}
                    onClick={onDeleteProject}
                    type="button">
                    {isDeletingProject ? 'Deleting...' : 'Delete project'}
                  </button>
                </section>
              ) : null}
            </aside>

            <div className="project-settings-content">
              <section className="project-settings-section">
                <div className="project-panel-heading project-panel-heading-subtle">
                  <div>
                    <h3>Members</h3>
                    <p className="info-text">
                      Owner, admin, and member permissions stay scoped to this project.
                    </p>
                  </div>

                  <span className="pill pill-neutral">{memberCount}</span>
                </div>

                <div className="member-list member-list-compact">
                  {project.members?.map((member) => {
                    const memberUser = getMemberUser(member);
                    const displayName = memberUser?.name || memberUser?.email || 'Unknown user';
                    const isOwner = member.role === 'owner';
                    const isCurrentUser = memberUser?._id === currentUser?._id;
                    const canOpenMemberMenu = canManageMembers && !isOwner && !isCurrentUser;
                    const canPromoteToAdmin = member.role !== 'admin';
                    const canDemoteToMember = member.role !== 'member';
                    const isUpdatingRole = memberActionKey === `role:${memberUser?._id}`;
                    const isRemoving = memberActionKey === `remove:${memberUser?._id}`;

                    return (
                      <article className="member-card member-card-compact" key={memberUser?._id || member.role}>
                        <div className="member-identity">
                          <span className="member-avatar" aria-hidden="true">
                            {getInitials(displayName)}
                          </span>

                          <div className="member-card-main">
                            <strong>{displayName}</strong>
                            <span>{memberUser?.email || 'No email'}</span>
                            <span>Joined {formatDate(member.joinedAt)}</span>
                          </div>
                        </div>

                        <div className="member-card-actions">
                          <span className="pill pill-neutral">{member.role}</span>

                          {canOpenMemberMenu ? (
                            <SettingsMenu
                              isOpen={activeMemberMenuId === memberUser?._id}
                              onClose={() => setActiveMemberMenuId('')}
                              onToggle={() =>
                                setActiveMemberMenuId((current) =>
                                  current === memberUser?._id ? '' : memberUser?._id
                                )
                              }>
                              {canPromoteToAdmin ? (
                                <button
                                  className="settings-menu-item"
                                  disabled={isUpdatingRole}
                                  onClick={() => handleUpdateRole(memberUser?._id, 'admin')}
                                  type="button">
                                  {isUpdatingRole ? 'Updating role...' : 'Make admin'}
                                </button>
                              ) : null}

                              {canDemoteToMember ? (
                                <button
                                  className="settings-menu-item"
                                  disabled={isUpdatingRole}
                                  onClick={() => handleUpdateRole(memberUser?._id, 'member')}
                                  type="button">
                                  {isUpdatingRole ? 'Updating role...' : 'Make member'}
                                </button>
                              ) : null}

                              <button
                                className="settings-menu-item settings-menu-item-danger"
                                disabled={isRemoving}
                                onClick={() => handleRemoveMember(memberUser?._id)}
                                type="button">
                                {isRemoving ? 'Removing...' : 'Remove member'}
                              </button>
                            </SettingsMenu>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="project-settings-section">
                <div className="project-panel-heading project-panel-heading-subtle">
                  <div>
                    <h3>Pending invitations</h3>
                    <p className="info-text">
                      Expired or accepted invites stay hidden. New invites appear in the bell inbox.
                    </p>
                  </div>
                  <span className="pill pill-neutral">{pendingCount}</span>
                </div>

                {pendingCount ? (
                  <div className="invitation-list invitation-list-compact">
                    {pendingInvitations.map((invitation) => (
                      <article className="invitation-card invitation-card-compact" key={invitation._id || invitation.token}>
                        <div className="invitation-card-main">
                          <strong>{invitation.email}</strong>
                          <p className="info-text">
                            {invitation.role} access
                            {' · '}
                            invited by {invitation.invitedBy?.name || invitation.invitedBy?.email || 'Unknown'}
                          </p>
                          <p className="info-text">
                            Created {formatDate(invitation.createdAt)}
                            {' · '}
                            expires {formatDate(invitation.expiresAt)}
                          </p>
                        </div>

                        <div className="invitation-card-meta">
                          <span className="pill pill-neutral">{invitation.status}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="project-settings-empty">
                    <h4>No pending invitations</h4>
                    <p className="info-text">
                      New project invites will appear here after you send them.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </section>
      </div>

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        isSubmitting={isInviting}
        onClose={() => setIsInviteModalOpen(false)}
        onSubmit={handleInviteSubmit}
        projectName={project.name}
      />
    </>
  );
}

export default ProjectMembersPanel;
