import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../lib/ToastContext";
import JobCard from "../components/JobCard";
import JobFormModal from "../components/JobFormModal";

const STATUSES = ["saved", "applied", "interview", "offer", "rejected"];

export default function Board() {
  const { showToast } = useToast();
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState(null);
  const [modal, setModal] = useState(null); // null | { mode: "add" } | { mode: "edit", app }
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [list, s] = await Promise.all([api.listApplications(), api.stats()]);
    setApps(list);
    setStats(s);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function handleStatusChange(app, status) {
    await api.updateApplication(app.id, { status });
    await refresh();
  }

  async function handleDelete(app) {
    if (!confirm(`Delete "${app.title}" at ${app.company}? This can't be undone.`)) return;
    await api.deleteApplication(app.id);
    showToast("Application deleted.");
    await refresh();
  }

  async function handleAddSubmit(form) {
    await api.createApplication({ ...form, source: "manual", status: "saved" });
    showToast("Application added.");
    await refresh();
  }

  async function handleEditSubmit(form) {
    await api.updateApplication(modal.app.id, form);
    showToast("Application updated.");
    await refresh();
  }

  if (loading) return <div className="page-loading">Loading pipeline…</div>;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Application Pipeline</h1>
          <div className="sub">Everything you've applied to — added by hand or by the Chrome extension.</div>
        </div>
        <button className="btn" onClick={() => setModal({ mode: "add" })}>+ Add application</button>
      </div>

      {stats && (
        <div className="stat-strip">
          <div className="stat-card"><div className="val mono">{stats.total}</div><div className="lbl">Total</div></div>
          <div className="stat-card saved"><div className="val mono">{stats.saved}</div><div className="lbl">Saved</div><div className="bar"></div></div>
          <div className="stat-card applied"><div className="val mono">{stats.applied}</div><div className="lbl">Applied</div><div className="bar"></div></div>
          <div className="stat-card interview"><div className="val mono">{stats.interview}</div><div className="lbl">Interview</div><div className="bar"></div></div>
          <div className="stat-card offer"><div className="val mono">{stats.offer}</div><div className="lbl">Offer</div><div className="bar"></div></div>
        </div>
      )}

      <div className="board">
        {STATUSES.map((status) => {
          const items = apps.filter((a) => a.status === status);
          return (
            <div className="column" key={status}>
              <div className="column-head">
                <span className="title">{status}</span>
                <span className="count mono">{items.length}</span>
              </div>
              <div className="col-body">
                {items.length === 0 && <div className="empty-col">Nothing here yet.</div>}
                {items.map((app) => (
                  <JobCard
                    key={app.id}
                    app={app}
                    onStatusChange={handleStatusChange}
                    onEdit={(a) => setModal({ mode: "edit", app: a })}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modal?.mode === "add" && (
        <JobFormModal
          title="Add application"
          submitLabel="Save"
          onClose={() => setModal(null)}
          onSubmit={handleAddSubmit}
        />
      )}
      {modal?.mode === "edit" && (
        <JobFormModal
          title="Edit application"
          submitLabel="Save changes"
          initial={modal.app}
          onClose={() => setModal(null)}
          onSubmit={handleEditSubmit}
        />
      )}
    </>
  );
}
