import { apiRequest } from './client';

export const registerUser = (payload) =>
  apiRequest('/auth/register', {
    method: 'POST',
    body: payload,
  });

export const loginUser = (payload) =>
  apiRequest('/auth/login', {
    method: 'POST',
    body: payload,
  });

export const getMyProfile = (token) =>
  apiRequest('/auth/me', {
    method: 'GET',
    token,
  });
