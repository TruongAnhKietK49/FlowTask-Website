import { apiRequest } from './client';

export const getTasks = (token, queryParams) => {
  const query = new URLSearchParams();

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      query.set(key, value);
    }
  });

  const suffix = query.toString() ? `?${query.toString()}` : '';

  return apiRequest(`/tasks${suffix}`, {
    method: 'GET',
    token,
  });
};

export const createTask = (token, payload) =>
  apiRequest('/tasks', {
    method: 'POST',
    token,
    body: payload,
  });

export const updateTask = (token, taskId, payload) =>
  apiRequest(`/tasks/${taskId}`, {
    method: 'PUT',
    token,
    body: payload,
  });

export const updateTaskStatus = (token, taskId, status) =>
  apiRequest(`/tasks/${taskId}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  });

export const assignTask = (token, taskId, assignedTo) =>
  apiRequest(`/tasks/${taskId}/assign`, {
    method: 'PATCH',
    token,
    body: { assignedTo },
  });

export const createSubtask = (token, taskId, title) =>
  apiRequest(`/tasks/${taskId}/subtasks`, {
    method: 'POST',
    token,
    body: { title },
  });

export const updateSubtask = (token, taskId, subtaskId, payload) =>
  apiRequest(`/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: 'PATCH',
    token,
    body: payload,
  });

export const deleteSubtask = (token, taskId, subtaskId) =>
  apiRequest(`/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: 'DELETE',
    token,
  });

export const deleteTask = (token, taskId) =>
  apiRequest(`/tasks/${taskId}`, {
    method: 'DELETE',
    token,
  });
