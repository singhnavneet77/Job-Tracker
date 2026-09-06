const DEFAULT_SERVER = "http://127.0.0.1:8000";

function $(id) { return document.getElementById(id); }

function showMsg(el, text, ok) {
  el.textContent = text;
  el.className = "msg " + (ok ? "ok" : "err");
  el.style.display = "block";
}

function showView(name) {
  ["loginView", "mainView", "reviewView"].forEach((v) => {
    $(v).style.display = v === name ? "block" : "none";
  });
}

async function getSession() {
  const data = await chrome.storage.local.get(["token", "email", "serverUrl"]);
  return {
    token: data.token || "",
    email: data.email || "",
    serverUrl: data.serverUrl || DEFAULT_SERVER,
  };
}

async function apiCall(serverUrl, path, token, opts = {}) {
  const res = await fetch(serverUrl + path, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.status === 204 ? null : res.json();
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function init() {
  const { token, email, serverUrl } = await getSession();
  $("serverUrl").value = serverUrl;

  if (!token) {
    $("status").textContent = "signed out";
    $("status").classList.remove("on");
    showView("loginView");
    return;
  }

  try {
    await apiCall(serverUrl, "/extension/ping", token);
    $("status").textContent = "connected";
    $("status").classList.add("on");
    $("userEmail").textContent = email;
    showView("mainView");
  } catch (e) {
    $("status").textContent = "session expired";
    $("status").classList.remove("on");
    showView("loginView");
  }
}

$("loginBtn").addEventListener("click", async () => {
  const serverUrl = $("serverUrl").value.trim().replace(/\/$/, "") || DEFAULT_SERVER;
  const email = $("email").value.trim();
  const password = $("password").value;
  const msg = $("loginMsg");
  try {
    const data = await apiCall(serverUrl, "/auth/login", null, {
      method: "POST",
      body: { email, password },
    });
    await chrome.storage.local.set({ token: data.access_token, email, serverUrl });
    showMsg(msg, "Signed in.", true);
    init();
  } catch (e) {
    showMsg(msg, e.message, false);
  }
});

$("signOutLink").addEventListener("click", async (e) => {
  e.preventDefault();
  await chrome.storage.local.remove(["token", "email"]);
  init();
});

// ---------------- Review form helpers ----------------
function fillReviewForm(data) {
  $("r_company").value = data.company || "";
  $("r_title").value = data.title || "";
  $("r_location").value = data.location || "";
  $("r_salary").value = data.salary || "";
  $("r_url").value = data.job_url || "";
}

function readReviewForm() {
  return {
    company: $("r_company").value.trim(),
    title: $("r_title").value.trim(),
    location: $("r_location").value.trim(),
    salary: $("r_salary").value.trim(),
    job_url: $("r_url").value.trim(),
  };
}

$("fetchBtn").addEventListener("click", async () => {
  const msg = $("mainMsg");
  try {
    const tab = await activeTab();
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__jbpExtractJob__ ? window.__jbpExtractJob__() : null,
    });
    fillReviewForm({
      company: result?.company || "",
      title: result?.title || "",
      location: result?.location || "",
      salary: result?.salary || "",
      job_url: tab.url,
    });
    $("reviewHint").textContent = result?.title
      ? "Fetched from this page — check the details, then save."
      : "Couldn't detect job details automatically — fill them in below.";
    $("reviewMsg").style.display = "none";
    showView("reviewView");
  } catch (e) {
    showMsg(msg, e.message, false);
  }
});

$("manualBtn").addEventListener("click", async () => {
  const tab = await activeTab();
  fillReviewForm({ company: "", title: "", location: "", salary: "", job_url: tab?.url || "" });
  $("reviewHint").textContent = "Add a job manually — every field below is yours to fill in.";
  $("reviewMsg").style.display = "none";
  showView("reviewView");
});

$("cancelReviewBtn").addEventListener("click", () => showView("mainView"));

$("saveReviewBtn").addEventListener("click", async () => {
  const { token, serverUrl } = await getSession();
  const msg = $("reviewMsg");
  const form = readReviewForm();

  if (!form.company || !form.title) {
    showMsg(msg, "Company and role are required.", false);
    return;
  }

  try {
    await apiCall(serverUrl, "/applications", token, {
      method: "POST",
      body: {
        company: form.company,
        title: form.title,
        location: form.location,
        salary: form.salary,
        job_url: form.job_url,
        source: "extension",
        status: "saved",
      },
    });
    showMsg(msg, `Saved "${form.title}" at ${form.company} to your pipeline.`, true);
    setTimeout(() => showView("mainView"), 900);
  } catch (e) {
    showMsg(msg, e.message, false);
  }
});

// ---------------- Autofill ----------------
$("autofillBtn").addEventListener("click", async () => {
  const { token, serverUrl } = await getSession();
  const msg = $("mainMsg");
  try {
    const profile = await apiCall(serverUrl, "/profile", token);
    const tab = await activeTab();
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (p) => window.__jbpAutofill__ ? window.__jbpAutofill__(p) : { filled: 0 },
      args: [profile],
    });
    showMsg(msg, `Filled ${result.filled} field${result.filled === 1 ? "" : "s"} from your profile.`, result.filled > 0);
  } catch (e) {
    showMsg(msg, e.message, false);
  }
});

init();
