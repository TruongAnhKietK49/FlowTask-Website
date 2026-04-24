import { useEffect, useState } from 'react';
import { getMyProfile, loginUser, registerUser } from '../api/authApi';
import {
  acceptMyProjectInvitation,
  getMyProjectInvitations,
  getProjects,
  rejectMyProjectInvitation,
} from '../api/projectApi';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { AuthContext } from './authContextValue';

const AUTH_STORAGE_KEY = 'flowtask-auth-token';
const PROJECT_STORAGE_KEY_PREFIX = 'flowtask-selected-project';

const getProjectStorageKey = (userId) => `${PROJECT_STORAGE_KEY_PREFIX}:${userId}`;

const ensureProjectArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const dedupeProjects = (projects) => {
  const seenProjectIds = new Set();

  return projects.filter((project) => {
    if (!project?._id || seenProjectIds.has(project._id)) {
      return false;
    }

    seenProjectIds.add(project._id);
    return true;
  });
};

const buildProjectState = (payload = {}, user = null) => {
  const nestedData = payload?.data && !Array.isArray(payload.data) ? payload.data : null;

  let ownedProjects = ensureProjectArray(payload.ownedProjects || nestedData?.ownedProjects);
  let contributedProjects = ensureProjectArray(
    payload.contributedProjects || nestedData?.contributedProjects
  );

  if (!ownedProjects.length && !contributedProjects.length) {
    const fallbackProjects = dedupeProjects(
      ensureProjectArray(payload.projects || payload.data || nestedData?.projects)
    );

    if (fallbackProjects.length) {
      ownedProjects = fallbackProjects.filter((project) => {
        const ownerId =
          typeof project.owner === 'object' ? project.owner?._id : project.owner;

        return ownerId?.toString() === user?._id?.toString();
      });

      contributedProjects = fallbackProjects.filter((project) => {
        const ownerId =
          typeof project.owner === 'object' ? project.owner?._id : project.owner;

        return ownerId?.toString() !== user?._id?.toString();
      });
    }
  }

  const projects = dedupeProjects([...ownedProjects, ...contributedProjects]);

  return {
    ownedProjects,
    contributedProjects,
    projects,
  };
};

const buildInvitationState = (payload = {}) => ({
  invitations: Array.isArray(payload?.invitations) ? payload.invitations : [],
});

const resolveSelectedProjectId = (projectList, preferredProjectId, storedProjectId) => {
  if (!projectList.length) {
    return null;
  }

  const availableIds = new Set(projectList.map((project) => project._id));
  const activeProject = projectList.find((project) => project.status === 'active') || projectList[0];

  if (preferredProjectId && availableIds.has(preferredProjectId)) {
    return preferredProjectId;
  }

  if (storedProjectId && availableIds.has(storedProjectId)) {
    return storedProjectId;
  }

  return activeProject?._id || null;
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [ownedProjects, setOwnedProjects] = useState([]);
  const [contributedProjects, setContributedProjects] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(token));

  const syncProjects = (payload, nextUser, preferredProjectId = null) => {
    const nextProjectState = buildProjectState(payload, nextUser);

    setProjects(nextProjectState.projects);
    setOwnedProjects(nextProjectState.ownedProjects);
    setContributedProjects(nextProjectState.contributedProjects);

    if (!nextUser?._id) {
      setSelectedProjectIdState(null);
      return nextProjectState;
    }

    const storageKey = getProjectStorageKey(nextUser._id);
    const storedProjectId = localStorage.getItem(storageKey);
    const nextSelectedProjectId = resolveSelectedProjectId(
      nextProjectState.projects,
      preferredProjectId,
      storedProjectId
    );

    setSelectedProjectIdState(nextSelectedProjectId);

    if (nextSelectedProjectId) {
      localStorage.setItem(storageKey, nextSelectedProjectId);
      return nextProjectState;
    }

    localStorage.removeItem(storageKey);
    return nextProjectState;
  };

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      setUser(null);
      setProjects([]);
      setOwnedProjects([]);
      setContributedProjects([]);
      setInvitations([]);
      setSelectedProjectIdState(null);
      setIsBootstrapping(false);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    localStorage.setItem(AUTH_STORAGE_KEY, token);
    connectSocket(token);
    setIsBootstrapping(true);

    Promise.all([getMyProfile(token), getProjects(token), getMyProjectInvitations(token)])
      .then(([profileResponse, projectResponse, invitationResponse]) => {
        setUser(profileResponse.user);
        syncProjects(projectResponse, profileResponse.user);
        setInvitations(buildInvitationState(invitationResponse).invitations);
      })
      .catch(() => {
        setToken(null);
        setUser(null);
        setProjects([]);
        setOwnedProjects([]);
        setContributedProjects([]);
        setInvitations([]);
        setSelectedProjectIdState(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      })
      .finally(() => {
        setIsBootstrapping(false);
      });
  }, [token]);

  const login = async (credentials) => {
    const response = await loginUser(credentials);
    setIsBootstrapping(true);
    setProjects([]);
    setOwnedProjects([]);
    setContributedProjects([]);
    setInvitations([]);
    setSelectedProjectIdState(null);
    setToken(response.token);
    setUser(response.user);
    return response;
  };

  const register = async (payload) => {
    const response = await registerUser(payload);
    setIsBootstrapping(true);
    setProjects([]);
    setOwnedProjects([]);
    setContributedProjects([]);
    setInvitations([]);
    setSelectedProjectIdState(null);
    setToken(response.token);
    setUser(response.user);
    return response;
  };

  const refreshProjects = async (preferredProjectId = null) => {
    if (!token) {
      setProjects([]);
      setOwnedProjects([]);
      setContributedProjects([]);
      setSelectedProjectIdState(null);
      return buildProjectState({}, user);
    }

    const response = await getProjects(token);
    return syncProjects(response, user, preferredProjectId || selectedProjectId);
  };

  const refreshInvitations = async () => {
    if (!token) {
      setInvitations([]);
      return buildInvitationState();
    }

    const response = await getMyProjectInvitations(token);
    const nextInvitationState = buildInvitationState(response);
    setInvitations(nextInvitationState.invitations);
    return nextInvitationState;
  };

  const acceptInvitation = async (inviteId) => {
    const response = await acceptMyProjectInvitation(token, inviteId);
    await Promise.all([
      refreshProjects(response.project?._id || selectedProjectId),
      refreshInvitations(),
    ]);
    return response;
  };

  const rejectInvitation = async (inviteId) => {
    const response = await rejectMyProjectInvitation(token, inviteId);
    await refreshInvitations();
    return response;
  };

  const setSelectedProjectId = (projectId) => {
    setSelectedProjectIdState(projectId || null);

    if (!user?._id) {
      return;
    }

    const storageKey = getProjectStorageKey(user._id);

    if (projectId) {
      localStorage.setItem(storageKey, projectId);
      return;
    }

    localStorage.removeItem(storageKey);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setProjects([]);
    setOwnedProjects([]);
    setContributedProjects([]);
    setInvitations([]);
    setSelectedProjectIdState(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const selectedProject =
    projects.find((project) => project._id === selectedProjectId) || null;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        projects,
        ownedProjects,
        contributedProjects,
        invitations,
        selectedProject,
        selectedProjectId,
        invitationCount: invitations.length,
        isBootstrapping,
        login,
        register,
        logout,
        refreshProjects,
        refreshInvitations,
        acceptInvitation,
        rejectInvitation,
        setSelectedProjectId,
      }}>
      {children}
    </AuthContext.Provider>
  );
}
