import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function ProtectedRoute({ children }) {
  const { token, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <div className="page-shell centered-shell">Checking session...</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
