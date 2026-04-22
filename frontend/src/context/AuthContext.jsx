import { createContext, useEffect, useState } from 'react';
import { getMyProfile, loginUser, registerUser } from '../api/authApi';

const AUTH_STORAGE_KEY = 'todo-app-auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setUser(null);
      setIsBootstrapping(false);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    localStorage.setItem(AUTH_STORAGE_KEY, token);

    getMyProfile(token)
      .then((response) => {
        setUser(response.user);
      })
      .catch(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      })
      .finally(() => {
        setIsBootstrapping(false);
      });
  }, [token]);

  const login = async (credentials) => {
    const response = await loginUser(credentials);
    setToken(response.token);
    setUser(response.user);
    return response;
  };

  const register = async (payload) => {
    const response = await registerUser(payload);
    setToken(response.token);
    setUser(response.user);
    return response;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ token, user, isBootstrapping, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
