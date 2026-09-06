import { useState } from "react";

const EMPTY = { company: "", title: "", location: "", job_url: "", salary: "", notes: "" };

export default function JobFormModal({ initial, onClose, onSubmit, title, submitLabel }) {
  const [form, setForm] = useState({ ...EMPTY, ...(initial || {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.company.trim() || !form.title.trim()) {
      setError("Company and role are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card modal-box">
        <h2>{title}</h2>
        <div className="modal-sub">
          Every field here is editable — this is the same form whether you're adding a job by
          hand or reviewing what the extension captured.
        </div>
        {error && <div className="error-msg" style={{ display: "block" }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field-row">
            <div className="field">
              <label>Company *</label>
              <input value={form.company} onChange={(e) => set("company", e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label>Role / Title *</label>
              <input value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Location</label>
              <input value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>
            <div className="field">
              <label>Pay / Salary</label>
              <input
                value={form.salary}
                onChange={(e) => set("salary", e.target.value)}
                placeholder="e.g. ₹12-16 LPA, $120k-140k"
              />
            </div>
          </div>
          <div className="field">
            <label>Job URL</label>
            <input value={form.job_url} onChange={(e) => set("job_url", e.target.value)} placeholder="https://..." />
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <div className="right">
              <button type="submit" className="btn" disabled={saving}>
                {saving ? "Saving…" : submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
