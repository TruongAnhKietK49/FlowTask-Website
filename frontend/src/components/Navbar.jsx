import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function Navbar() {
  const { logout, user } = useAuth();

  return (
    <header className="topbar">
      <div>
        <Link className="brand" to="/dashboard">
          FlowTask
        </Link>
        <p className="topbar-subtitle">Your personal task command center.</p>
      </div>
      <div className="topbar-actions">
        <span className="user-badge">{user?.name}</span>
        <button className="ghost-button" onClick={logout} type="button">
          Sign out
        </button>
      </div>
    </header>
  );
}

export default Navbar;
