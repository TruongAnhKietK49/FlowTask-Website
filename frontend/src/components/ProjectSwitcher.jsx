function ProjectSwitcher({
  contributedProjects,
  onSelectProject,
  ownedProjects,
  selectedProject,
  selectedProjectId,
}) {
  const totalProjects = ownedProjects.length + contributedProjects.length;
  const handleSelectProject = (projectId) => {
    if (!projectId) {
      onSelectProject('');
      return;
    }

    onSelectProject(String(projectId));
  };

  return (
    <div className="project-switcher-inline">
      <label className="project-switcher-field">
        <span className="project-switcher-label">Selected project</span>
        <select
          name="selectedProjectId"
          onChange={(event) => handleSelectProject(event.target.value)}
          value={selectedProjectId || ''}>
          <option value="">Select a project</option>
          {!!ownedProjects.length && (
            <optgroup label="My Projects">
              {ownedProjects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </optgroup>
          )}
          {!!contributedProjects.length && (
            <optgroup label="Contributed Projects">
              {contributedProjects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>

      {selectedProject ? (
        <div className="project-switcher-meta">
          <span className="pill pill-neutral">
            {selectedProject.members?.length || 0} member
            {selectedProject.members?.length === 1 ? '' : 's'}
          </span>
          <span className="pill pill-neutral">
            Role: {selectedProject.currentUserRole || 'member'}
          </span>
          <span
            className={`pill ${
              selectedProject.status === 'archived'
                ? 'pill-priority-medium'
                : 'pill-priority-low'
            }`}>
            {selectedProject.status}
          </span>
        </div>
      ) : totalProjects ? (
        <p className="info-text project-switcher-empty">
          Pick a workspace to scope tasks and collaboration.
        </p>
      ) : (
        <p className="info-text project-switcher-empty">
          Create your first project to start working in a scoped workspace.
        </p>
      )}
    </div>
  );
}

export default ProjectSwitcher;
