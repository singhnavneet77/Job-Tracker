const STATUSES = ["saved", "applied", "interview", "offer", "rejected"];

export default function JobCard({ app, onStatusChange, onEdit, onDelete }) {
  const date = new Date(app.created_at).toLocaleDateString();

  return (
    <div className="job-card">
      <div className="card-actions">
        <button className="icon-btn" title="Edit" onClick={() => onEdit(app)}>✎</button>
        <button className="icon-btn danger" title="Delete" onClick={() => onDelete(app)}>✕</button>
      </div>
      <div className="company">{app.company}</div>
      <div className="title">{app.title}{app.location ? " · " + app.location : ""}</div>
      {app.salary && <div className="salary">{app.salary}</div>}
      {app.job_url && (
        <div>
          <a className="joblink" href={app.job_url} target="_blank" rel="noreferrer">View posting ↗</a>
        </div>
      )}
      <div className="meta">
        <span className="src">{app.source === "extension" ? "⚡ extension" : "manual"}</span>
        <span className="date">{date}</span>
      </div>
      <select
        className="status-select"
        value={app.status}
        onChange={(e) => onStatusChange(app, e.target.value)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
        ))}
      </select>
    </div>
  );
}
