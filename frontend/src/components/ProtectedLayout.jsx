import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import Sidebar from "./Sidebar";

export default function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  );
}
