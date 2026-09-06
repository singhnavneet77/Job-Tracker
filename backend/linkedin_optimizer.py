"""
Rule-based LinkedIn profile optimizer.

Deliberately dependency-free (no external LLM call) so the feature works
out of the box with no API key. If you want richer, model-generated
rewrites, swap `_optimized_headline()` for a call to the same
Gemini/OpenAI client used in the resume-copilot backend — the function
boundary is already isolated for that.
"""
import re
from schemas import LinkedInInput, LinkedInReport, LinkedInSuggestion

ACTION_VERBS = {
    "led", "built", "designed", "launched", "drove", "architected", "shipped",
    "optimized", "scaled", "reduced", "increased", "improved", "automated",
    "implemented", "developed", "created", "spearheaded", "delivered",
    "managed", "mentored", "researched", "deployed",
}

FILLER_PHRASES = [
    "responsible for", "team player", "hard worker", "detail oriented",
    "passionate about", "results driven", "self-starter",
]

ROLE_KEYWORDS = {
    "machine learning engineer": [
        "python", "pytorch", "tensorflow", "deep learning", "mlops",
        "model deployment", "nlp", "computer vision", "sql", "docker",
    ],
    "software engineer": [
        "python", "java", "system design", "data structures", "algorithms",
        "rest api", "git", "ci/cd", "cloud", "testing",
    ],
    "data scientist": [
        "python", "sql", "statistics", "machine learning", "pandas",
        "data visualization", "a/b testing", "etl",
    ],
    "full stack developer": [
        "react", "node.js", "javascript", "typescript", "rest api",
        "sql", "docker", "aws", "css", "next.js",
    ],
}


def _score_headline(headline: str) -> tuple[int, list[LinkedInSuggestion]]:
    issues = []
    score = 100
    h = headline.strip()

    if not h:
        return 0, [LinkedInSuggestion(
            category="Headline", issue="Headline is empty.",
            suggestion="Add a headline: Role + specialization + value, e.g. "
                       "'Machine Learning Engineer | PyTorch & NLP | Turning research into shipped products'.")]

    if len(h) < 40:
        score -= 25
        issues.append(LinkedInSuggestion(
            category="Headline", issue="Headline is short and generic.",
            suggestion="LinkedIn allows 220 characters — use the space. Combine role, "
                       "top skills, and the value you deliver, separated by '|'."))

    if "|" not in h and "-" not in h:
        score -= 10
        issues.append(LinkedInSuggestion(
            category="Headline", issue="Single flat phrase with no structure.",
            suggestion="Break it into segments with '|', e.g. 'Role | Key Skills | Impact'."))

    if not re.search(r"\d", h):
        score -= 5
        issues.append(LinkedInSuggestion(
            category="Headline", issue="No quantifiable signal.",
            suggestion="Consider a number if you have one (years of experience, a metric, a paper count)."))

    return max(score, 0), issues


def _score_about(about: str) -> tuple[int, list[LinkedInSuggestion]]:
    issues = []
    score = 100
    a = about.strip()

    if not a:
        return 0, [LinkedInSuggestion(
            category="About", issue="About section is empty.",
            suggestion="Write 3-5 short paragraphs: who you are, what you've built, "
                       "your stack, and what you're looking for next.")]

    word_count = len(a.split())
    if word_count < 80:
        score -= 25
        issues.append(LinkedInSuggestion(
            category="About", issue=f"About section is thin ({word_count} words).",
            suggestion="Aim for 150-300 words — enough to show impact, not so much recruiters skim past it."))

    found_verbs = [v for v in ACTION_VERBS if re.search(rf"\b{v}\b", a.lower())]
    if len(found_verbs) < 2:
        score -= 20
        issues.append(LinkedInSuggestion(
            category="About", issue="Few strong action verbs.",
            suggestion="Open sentences with verbs like 'built', 'led', 'shipped', 'reduced' "
                       "instead of passive phrasing."))

    found_fillers = [f for f in FILLER_PHRASES if f in a.lower()]
    if found_fillers:
        score -= 10 * len(found_fillers)
        issues.append(LinkedInSuggestion(
            category="About", issue=f"Filler phrases found: {', '.join(found_fillers)}.",
            suggestion="Replace generic self-descriptions with a specific result "
                       "(what you built, its scale, or its measurable outcome)."))

    if not re.search(r"\d", a):
        score -= 10
        issues.append(LinkedInSuggestion(
            category="About", issue="No metrics anywhere in the About section.",
            suggestion="Add at least one number: users served, accuracy gained, latency cut, team size led."))

    return max(score, 0), issues


def _score_skills(skills_csv: str, target_role: str) -> tuple[int, list[LinkedInSuggestion], list[str]]:
    skills = {s.strip().lower() for s in skills_csv.split(",") if s.strip()}
    role_key = target_role.strip().lower()
    expected = ROLE_KEYWORDS.get(role_key, [])

    issues = []
    score = 100
    gaps = [k for k in expected if k not in skills]

    if len(skills) < 5:
        score -= 20
        issues.append(LinkedInSuggestion(
            category="Skills", issue=f"Only {len(skills)} skills listed.",
            suggestion="List at least 10-15 skills — LinkedIn's search and recruiter "
                       "filters match on this section heavily."))

    if expected and gaps:
        score -= min(30, 5 * len(gaps))
        issues.append(LinkedInSuggestion(
            category="Skills",
            issue=f"Missing common keywords for '{target_role}': {', '.join(gaps)}.",
            suggestion="Add the ones that are genuinely true for you — recruiters "
                       "and LinkedIn search both filter on exact skill matches."))

    return max(score, 0), issues, gaps


def _optimized_headline(headline: str, target_role: str, skills_csv: str) -> str:
    """Very light rewrite using the inputs already provided — not a generic template dump."""
    top_skills = [s.strip() for s in skills_csv.split(",") if s.strip()][:3]
    role = target_role.strip() or (headline.strip() or "Your Role")
    skills_part = " & ".join(top_skills) if top_skills else "Your Core Skills"
    return f"{role} | {skills_part} | Building things that ship"


def analyze_profile(payload: LinkedInInput) -> LinkedInReport:
    h_score, h_issues = _score_headline(payload.headline or "")
    a_score, a_issues = _score_about(payload.about or "")
    s_score, s_issues, gaps = _score_skills(payload.skills or "", payload.target_role or "")

    overall = round(h_score * 0.3 + a_score * 0.45 + s_score * 0.25)

    return LinkedInReport(
        overall_score=overall,
        section_scores={"headline": h_score, "about": a_score, "skills": s_score},
        suggestions=h_issues + a_issues + s_issues,
        optimized_headline=_optimized_headline(payload.headline or "", payload.target_role or "", payload.skills or ""),
        keyword_gaps=gaps,
    )
