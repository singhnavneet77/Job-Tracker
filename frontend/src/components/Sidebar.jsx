import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function Sidebar() {
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }) => "nav-link" + (isActive ? " active" : "");

  return (
    <aside className="sidebar">
      <div className="brand"><span className="dot"></span> JobBoard&nbsp;Pro</div>
      <NavLink to="/board" className={linkClass}><span className="bar"></span> Pipeline</NavLink>
      <NavLink to="/linkedin" className={linkClass}><span className="bar"></span> LinkedIn Optimizer</NavLink>
      <NavLink to="/profile" className={linkClass}><span className="bar"></span> Main Profile</NavLink>
      <div className="sidebar-footer">
        <div className="user-chip">
          <span>{user?.email}</span>
          <a className="logout-btn" href="#" onClick={(e) => { e.preventDefault(); logout(); }}>
            Sign out →
          </a>
        </div>
      </div>
    </aside>
  );
}
