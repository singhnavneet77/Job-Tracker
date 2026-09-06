import { useState } from "react";
import { api } from "../lib/api";

export default function LinkedIn() {
  const [targetRole, setTargetRole] = useState("");
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [skills, setSkills] = useState("");
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.linkedinOptimize({ headline, about, skills, target_role: targetRole });
      setReport(r);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>LinkedIn Optimizer</h1>
          <div className="sub">Paste your current headline, About section, and skills to get a scored, actionable report.</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Target role</label>
              <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Machine Learning Engineer" list="roles" />
              <datalist id="roles">
                <option value="Machine Learning Engineer" />
                <option value="Software Engineer" />
                <option value="Data Scientist" />
                <option value="Full Stack Developer" />
              </datalist>
            </div>
            <div className="field"><label>Current headline</label><input value={headline} onChange={(e) => setHeadline(e.target.value)} /></div>
            <div className="field"><label>About section</label><textarea style={{ minHeight: 160 }} value={about} onChange={(e) => setAbout(e.target.value)} /></div>
            <div className="field"><label>Skills (comma separated)</label><input value={skills} onChange={(e) => setSkills(e.target.value)} /></div>
            <button className="btn" type="submit" style={{ width: "100%" }} disabled={busy}>
              {busy ? "Analyzing…" : "Analyze profile"}
            </button>
          </form>
        </div>

        {report && (
          <div>
            <div className="card" style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 16 }}>
              <div className="score-ring" style={{ "--score": report.overall_score }}>
                <div className="num">{report.overall_score}</div>
                <div className="lbl">SCORE</div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 6 }}>Suggested rewritten headline</div>
                <div className="card" style={{ padding: 12, background: "var(--surface-2)", borderColor: "var(--accent-dim)" }}>
                  {report.optimized_headline}
                </div>
              </div>
            </div>
            <div className="card">
              <div style={{ marginBottom: 12 }}>
                {Object.entries(report.section_scores).map(([k, v]) => (
                  <span key={k} className="badge" style={{ marginRight: 8 }}>{k}: {v}/100</span>
                ))}
              </div>
              {report.keyword_gaps.length > 0 && (
                <div style={{ margin: "14px 0", fontSize: 12, color: "var(--text-dim)" }}>
                  Missing keywords for this role: {report.keyword_gaps.join(", ")}
                </div>
              )}
              {report.suggestions.length === 0 && (
                <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Nothing to flag — this section looks solid.</div>
              )}
              {report.suggestions.map((s, i) => (
                <div className="suggestion" key={i}>
                  <div className="cat">{s.category}</div>
                  <div className="issue">{s.issue}</div>
                  <div className="fix">→ {s.suggestion}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
