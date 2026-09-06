import { useEffect, useState } from "react";
import { api } from "../lib/api";

const FIELDS = ["full_name", "email", "phone", "location", "linkedin_url", "github_url",
  "portfolio_url", "headline", "summary", "skills", "experience_years", "resume_text"];

const EMPTY = Object.fromEntries(FIELDS.map((f) => [f, ""]));

export default function Profile() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState("synced");

  useEffect(() => {
    api.getProfile().then((p) => {
      const next = { ...EMPTY };
      FIELDS.forEach((f) => { next[f] = p[f] ?? ""; });
      setForm(next);
    }).finally(() => setLoading(false));
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, experience_years: parseFloat(form.experience_years) || 0 };
    await api.updateProfile(payload);
    setSaveState("saved ✓");
    setTimeout(() => setSaveState("synced"), 1500);
  }

  if (loading) return <div className="page-loading">Loading profile…</div>;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Main Profile</h1>
          <div className="sub">This is the single source of truth the Chrome extension autofills job forms from.</div>
        </div>
        <span className="badge">{saveState}</span>
      </div>

      <div className="card" style={{ maxWidth: 760 }}>
        <form onSubmit={handleSubmit}>
          <div className="field-row">
            <div className="field"><label>Full name</label><input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} /></div>
            <div className="field"><label>Email</label><input value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            <div className="field"><label>Location</label><input value={form.location} onChange={(e) => set("location", e.target.value)} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>LinkedIn URL</label><input value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} /></div>
            <div className="field"><label>GitHub URL</label><input value={form.github_url} onChange={(e) => set("github_url", e.target.value)} /></div>
          </div>
          <div className="field"><label>Portfolio URL</label><input value={form.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} /></div>
          <div className="field"><label>Headline</label>
            <input value={form.headline} onChange={(e) => set("headline", e.target.value)} placeholder="e.g. Machine Learning Engineer | PyTorch & NLP" />
          </div>
          <div className="field"><label>Summary</label><textarea value={form.summary} onChange={(e) => set("summary", e.target.value)} /></div>
          <div className="field"><label>Skills (comma separated)</label>
            <input value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="python, pytorch, sql, docker" />
          </div>
          <div className="field-row">
            <div className="field"><label>Years of experience</label>
              <input type="number" step="0.5" value={form.experience_years} onChange={(e) => set("experience_years", e.target.value)} />
            </div>
          </div>
          <div className="field"><label>Resume text (used for extension autofill on longer form fields)</label>
            <textarea style={{ minHeight: 140 }} value={form.resume_text} onChange={(e) => set("resume_text", e.target.value)} />
          </div>
          <button className="btn" type="submit">Save profile</button>
        </form>
      </div>
    </>
  );
}
