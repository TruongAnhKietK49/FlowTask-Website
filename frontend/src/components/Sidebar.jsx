function ProjectSection({
  isCollapsed,
  projects,
  selectedProjectId,
  title,
  onSelectProject,
}) {
  if (!projects.length) {
    return null;
  }

  return (
    <section className="project-nav-section">
      {!isCollapsed ? (
        <div className="project-nav-section-header">
          <span>{title}</span>
          <strong>{projects.length}</strong>
        </div>
      ) : null}

      <div className="project-nav-list">
        {projects.map((project) => {
          const isActive = project._id === selectedProjectId;

          return (
            <button
              className={`project-nav-item${isActive ? " is-active" : ""}`}
              key={project._id}
              onClick={() => onSelectProject(project._id)}
              title={`${project.name} · ${project.members?.length || 0} members`}
              type="button">
              <span
                aria-hidden="true"
                className="project-nav-color"
                style={{ backgroundColor: project.color || "#2563eb" }}
              />

              {!isCollapsed ? (
                <span className="project-nav-copy">
                  <strong>{project.name}</strong>
                  <span>
                    {project.members?.length || 0} members ·{" "}
                    {project.currentUserRole || "member"}
                  </span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Sidebar({
  contributedProjects,
  isCollapsed,
  onCreateProject,
  onSelectProject,
  onToggleCollapse,
  ownedProjects,
  selectedProjectId,
}) {
  const totalProjects = ownedProjects.length + contributedProjects.length;

  return (
    <aside
      className={`dashboard-project-sidebar${isCollapsed ? " is-collapsed" : ""}`}>
      <div className="panel project-sidebar-card">
        <div className="project-sidebar-topbar">
          {!isCollapsed ? (
            <div>
              <p className="eyebrow compact-eyebrow">Project workspace</p>
              <h2>Projects</h2>
            </div>
          ) : null}

          <button
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="ghost-button icon-only-button"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button">
            <span aria-hidden="true" className="icon-button-svg">
              <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
                <path
                  d={
                    isCollapsed
                      ? "M9 18l6-6-6-6"
                      : "M15 18l-6-6 6-6"
                  }
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </span>
          </button>
        </div>

        <button
          className={`primary-button project-sidebar-create${
            isCollapsed ? " is-collapsed" : ""
          }`}
          onClick={onCreateProject}
          title="Create a new project"
          type="button">
          <span aria-hidden="true">+</span>
          {!isCollapsed ? <span>New Project</span> : null}
        </button>

        {!totalProjects ? (
          <section className="project-sidebar-empty">
            {!isCollapsed ? (
              <>
                <h3>No projects yet</h3>
                <p>Create a project to start organizing tasks by workspace.</p>
              </>
            ) : null}
          </section>
        ) : (
          <div className="project-sidebar-scroll">
            <ProjectSection
              isCollapsed={isCollapsed}
              onSelectProject={onSelectProject}
              projects={ownedProjects}
              selectedProjectId={selectedProjectId}
              title="My Projects"
            />

            <ProjectSection
              isCollapsed={isCollapsed}
              onSelectProject={onSelectProject}
              projects={contributedProjects}
              selectedProjectId={selectedProjectId}
              title="Contributed Projects"
            />
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
