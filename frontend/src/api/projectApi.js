import { apiRequest } from './client';

export const getProjects = (token) =>
  apiRequest('/projects', {
    method: 'GET',
    token,
  });

export const createProject = (token, payload) =>
  apiRequest('/projects', {
    method: 'POST',
    token,
    body: payload,
  });

export const deleteProject = (token, projectId) =>
  apiRequest(`/projects/${projectId}`, {
    method: 'DELETE',
    token,
  });

export const getProjectMembers = (token, projectId) =>
  apiRequest(`/projects/${projectId}/members`, {
    method: 'GET',
    token,
  });

export const inviteProjectMember = (token, projectId, payload) =>
  apiRequest(`/projects/${projectId}/invitations`, {
    method: 'POST',
    token,
    body: payload,
  });

export const getMyProjectInvitations = (token) =>
  apiRequest('/project-invitations/me', {
    method: 'GET',
    token,
  });

export const acceptMyProjectInvitation = (token, inviteId) =>
  apiRequest(`/project-invitations/${inviteId}/accept`, {
    method: 'POST',
    token,
  });

export const rejectMyProjectInvitation = (token, inviteId) =>
  apiRequest(`/project-invitations/${inviteId}/reject`, {
    method: 'POST',
    token,
  });

export const acceptProjectInvite = (token, inviteToken) =>
  apiRequest(`/projects/invitations/${inviteToken}/accept`, {
    method: 'POST',
    token,
  });

export const removeProjectMember = (token, projectId, userId) =>
  apiRequest(`/projects/${projectId}/members/${userId}`, {
    method: 'DELETE',
    token,
  });

export const updateProjectMemberRole = (token, projectId, userId, role) =>
  apiRequest(`/projects/${projectId}/members/${userId}`, {
    method: 'PATCH',
    token,
    body: { role },
  });
