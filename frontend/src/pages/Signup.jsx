import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signup(fullName, email, password);
      navigate("/board");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div className="brand"><span className="dot"></span> JobBoard&nbsp;Pro</div>
        <div className="card">
          <h2>Create your account</h2>
          <div className="sub">Track applications. Optimize LinkedIn. Autofill from the extension.</div>
          {error && <div className="error-msg" style={{ display: "block" }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Full name</label>
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn" style={{ width: "100%" }} disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
          <div className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></div>
        </div>
      </div>
    </div>
  );
}
