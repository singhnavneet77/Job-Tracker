import { Link } from "react-router-dom";

const features = [
  {
    icon: "▦",
    title: "Track every application",
    text: "Keep your opportunities organized in one visual pipeline, from saved to offer.",
  },
  {
    icon: "↗",
    title: "Apply with confidence",
    text: "Improve your LinkedIn profile and keep the details that matter close at hand.",
  },
  {
    icon: "⚡",
    title: "Capture jobs instantly",
    text: "Use the Chrome extension to save job postings and autofill applications as you browse.",
  },
];

export default function Home() {
  return (
    <div className="home-page">
      <header className="home-nav">
        <Link className="brand" to="/">
          <span className="dot"></span> JobBoard&nbsp;Pro
        </Link>
        <nav className="home-nav-actions" aria-label="Account navigation">
          <Link className="home-sign-in" to="/login">Sign in</Link>
          <Link className="btn" to="/signup">Create account</Link>
        </nav>
      </header>

      <main>
        <section className="home-hero">
          <div className="home-hero-copy">
            <div className="eyebrow"><span></span> Your job search, organized</div>
            <h1>Turn your job search into a <em>system.</em></h1>
            <p className="home-lead">
              JobBoard Pro helps you capture opportunities, track applications,
              and move from searching to hired with less busywork.
            </p>
            <div className="home-cta">
              <Link className="btn home-primary-cta" to="/signup">Start tracking for free <span>→</span></Link>
              <a className="home-extension-link" href="/jobboard-pro-extension.zip" download>
                <span className="download-icon">↓</span>
                <span><strong>Get the Chrome extension</strong><small>Download and load it in Chrome</small></span>
              </a>
            </div>
          </div>
          <div className="home-hero-visual" aria-label="Job application pipeline preview">
            <div className="visual-window">
              <div className="visual-window-bar"><span></span><span></span><span></span><label>APPLICATION PIPELINE</label></div>
              <div className="visual-stats"><div><strong>24</strong><small>saved</small></div><div><strong>8</strong><small>applied</small></div><div><strong className="amber">3</strong><small>interviews</small></div></div>
              <div className="visual-columns"><div><b>SAVED</b><i>Northstar</i><i>Vercel</i></div><div><b>APPLIED</b><i>Linear</i><i>Notion</i></div><div><b>INTERVIEW</b><i className="highlight">Acme Inc.</i></div></div>
            </div>
          </div>
        </section>

        <section className="home-features" aria-label="What JobBoard Pro does">
          {features.map((feature) => (
            <article className="home-feature" key={feature.title}>
              <div className="feature-icon">{feature.icon}</div>
              <h2>{feature.title}</h2>
              <p>{feature.text}</p>
            </article>
          ))}
        </section>

        <section className="home-extension-banner">
          <div>
            <div className="eyebrow"><span></span> Built for the way you search</div>
            <h2>Find a job. Save it. Keep moving.</h2>
            <p>Install the extension to capture jobs from any page and autofill applications using your profile.</p>
          </div>
          <a className="btn" href="/jobboard-pro-extension.zip" download>Download extension <span>↓</span></a>
        </section>
      </main>

      <footer className="home-footer">
        <span>© 2026 JobBoard Pro</span>
        <span>Less tab-switching. More progress.</span>
      </footer>
    </div>
  );
}
