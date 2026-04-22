const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const buildHeaders = (token, isJson = true) => {
  const headers = {};

  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

export const apiRequest = async (path, options = {}) => {
  const { token, body, headers, ...restOptions } = options;

  const response = await fetch(`${API_URL}${path}`, {
    ...restOptions,
    headers: {
      ...buildHeaders(token, body !== undefined),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.message || 'Request failed');
  }

  return payload;
};
