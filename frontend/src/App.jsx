import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext";
import { ToastProvider } from "./lib/ToastContext";
import ProtectedLayout from "./components/ProtectedLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Board from "./pages/Board";
import Profile from "./pages/Profile";
import LinkedIn from "./pages/LinkedIn";
import Home from "./pages/Home";
import "./styles.css";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/board" element={<ProtectedLayout><Board /></ProtectedLayout>} />
          <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
          <Route path="/linkedin" element={<ProtectedLayout><LinkedIn /></ProtectedLayout>} />
          <Route path="*" element={<Navigate to="/board" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
