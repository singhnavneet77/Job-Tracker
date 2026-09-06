/* JobBoard Pro — content script
 * Runs on every page. Exposes two functions on `window` that the popup
 * invokes via chrome.scripting.executeScript:
 *   window.__jbpExtractJob__()      -> { title, company, location, description }
 *   window.__jbpAutofill__(profile) -> { filled: number }
 */

(function () {
  if (window.__jbpContentLoaded__) return; // avoid double-injection
  window.__jbpContentLoaded__ = true;

  // ---------------------------------------------------------------
  // 1. JOB EXTRACTION
  // ---------------------------------------------------------------
  function textOf(sel) {
    const el = document.querySelector(sel);
    return el ? el.textContent.trim().replace(/\s+/g, " ") : "";
  }

  function metaContent(name) {
    const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
    return el ? el.getAttribute("content") : "";
  }

  function formatSalary(salaryObj) {
    if (!salaryObj) return "";
    try {
      const val = salaryObj.value || salaryObj;
      const currency = salaryObj.currency || "";
      if (val && (val.minValue || val.maxValue)) {
        const min = val.minValue, max = val.maxValue, unit = val.unitText ? `/${val.unitText.toLowerCase()}` : "";
        if (min && max) return `${currency} ${min}-${max}${unit}`.trim();
        if (min) return `${currency} ${min}+${unit}`.trim();
      }
      if (val && val.value) return `${currency} ${val.value}`.trim();
    } catch (e) { /* ignore malformed salary blocks */ }
    return "";
  }

  function fromJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent);
        const items = Array.isArray(data) ? data : [data, ...(data["@graph"] || [])];
        for (const item of items) {
          if (item && (item["@type"] === "JobPosting" || (Array.isArray(item["@type"]) && item["@type"].includes("JobPosting")))) {
            const org = item.hiringOrganization;
            const loc = item.jobLocation;
            let location = "";
            if (loc) {
              const addr = Array.isArray(loc) ? loc[0]?.address : loc.address;
              if (addr) {
                location = [addr.addressLocality, addr.addressRegion, addr.addressCountry]
                  .filter(Boolean).join(", ");
              }
            }
            return {
              title: item.title || "",
              company: (org && (org.name || org)) || "",
              location: location || (item.jobLocationType === "TELECOMMUTE" ? "Remote" : ""),
              salary: formatSalary(item.baseSalary || item.estimatedSalary),
              description: (item.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000),
            };
          }
        }
      } catch (e) { /* not valid JSON-LD, skip */ }
    }
    return null;
  }

  // Lightweight, best-effort selectors for a few common sites.
  // These are supplementary — JSON-LD (above) is the primary, more robust path.
  const SITE_RULES = [
    {
      host: "linkedin.com",
      title: ".job-details-jobs-unified-top-card__job-title, .top-card-layout__title",
      company: ".job-details-jobs-unified-top-card__company-name, .topcard__org-name-link",
      location: ".job-details-jobs-unified-top-card__primary-description-container, .topcard__flavor--bullet",
    },
    {
      host: "indeed.com",
      title: "h1.jobsearch-JobInfoHeader-title, [data-testid='jobsearch-JobInfoHeader-title']",
      company: "[data-testid='inlineHeader-companyName']",
      location: "[data-testid='inlineHeader-companyLocation']",
    },
    {
      host: "greenhouse.io",
      title: "h1.app-title, h1",
      company: ".company-name",
      location: ".location",
    },
    {
      host: "lever.co",
      title: ".posting-headline h2",
      company: ".main-header-logo img",
      location: ".posting-categories .location",
    },
  ];

  function fromSiteRules() {
    const host = window.location.hostname;
    const rule = SITE_RULES.find((r) => host.includes(r.host));
    if (!rule) return null;
    const title = textOf(rule.title);
    if (!title) return null;
    return {
      title,
      company: textOf(rule.company),
      location: textOf(rule.location),
      salary: "",
      description: "",
    };
  }

  function fromGenericFallback() {
    const title =
      metaContent("og:title") ||
      textOf("h1") ||
      document.title;
    const company = metaContent("og:site_name") || "";
    return { title: title || "", company, location: "", salary: "", description: "" };
  }

  window.__jbpExtractJob__ = function () {
    return fromJsonLd() || fromSiteRules() || fromGenericFallback();
  };

  // ---------------------------------------------------------------
  // 2. FORM AUTOFILL
  // ---------------------------------------------------------------
  // Maps a profile field to the words a form field's name/id/label/
  // placeholder/aria-label might contain. Order matters — first match wins,
  // so more specific keys (e.g. "linkedin") are listed before generic ones.
  const FIELD_MAP = [
    { profileKey: "email", keywords: ["email", "e-mail"] },
    { profileKey: "phone", keywords: ["phone", "mobile", "contact number", "telephone"] },
    { profileKey: "linkedin_url", keywords: ["linkedin"] },
    { profileKey: "github_url", keywords: ["github"] },
    { profileKey: "portfolio_url", keywords: ["portfolio", "website", "personal site"] },
    { profileKey: "location", keywords: ["location", "city", "address"] },
    { profileKey: "headline", keywords: ["headline", "title you are applying"] },
    { profileKey: "full_name", keywords: ["full name", "your name", "candidate name", "applicant name"] },
    { profileKey: "summary", keywords: ["cover letter", "summary", "about you", "why are you interested", "additional information"] },
    { profileKey: "resume_text", keywords: ["resume text", "paste resume", "experience"] },
  ];

  function labelTextFor(el) {
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) return lbl.textContent;
    }
    const parentLabel = el.closest("label");
    if (parentLabel) return parentLabel.textContent;
    return "";
  }

  function signatureFor(el) {
    return [
      el.name, el.id, el.placeholder, el.getAttribute("aria-label"),
      labelTextFor(el),
    ].filter(Boolean).join(" ").toLowerCase();
  }

  // Setting `.value` directly doesn't notify React/Vue-controlled inputs.
  // Use the native setter + dispatch input/change so frameworks pick it up.
  function setNativeValue(el, value) {
    const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // First / last name split for forms that separate them.
  function splitName(fullName) {
    const parts = (fullName || "").trim().split(/\s+/);
    return { first: parts[0] || "", last: parts.slice(1).join(" ") || "" };
  }

  window.__jbpAutofill__ = function (profile) {
    let filled = 0;
    const { first, last } = splitName(profile.full_name);
    const fields = document.querySelectorAll("input, textarea");

    fields.forEach((el) => {
      if (el.type === "hidden" || el.type === "submit" || el.type === "button" || el.disabled) return;
      const sig = signatureFor(el);
      if (!sig) return;

      // first / last name special-case before the generic full_name match
      if (/first name/.test(sig) && first) { setNativeValue(el, first); filled++; return; }
      if (/last name/.test(sig) && last) { setNativeValue(el, last); filled++; return; }

      for (const { profileKey, keywords } of FIELD_MAP) {
        const value = profile[profileKey];
        if (!value) continue;
        if (keywords.some((k) => sig.includes(k))) {
          setNativeValue(el, String(value));
          filled++;
          return;
        }
      }
    });

    return { filled };
  };
})();
