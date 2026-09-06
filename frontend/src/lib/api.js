// Note: `??` (not `||`) on purpose — an explicitly empty VITE_API_URL means
// "same origin as the frontend" (used when backend + frontend are served
// from one combined deployment), which `||` would incorrectly override.
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("jbp_token") || "";
}

export function setToken(token) {
  localStorage.setItem("jbp_token", token);
}

export function clearToken() {
  localStorage.removeItem("jbp_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

  const res = await fetch(BASE_URL + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  base: BASE_URL,
  signup: (payload) => request("/auth/signup", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  me: () => request("/auth/me"),

  getProfile: () => request("/profile"),
  updateProfile: (payload) => request("/profile", { method: "PUT", body: payload }),

  listApplications: () => request("/applications"),
  createApplication: (payload) => request("/applications", { method: "POST", body: payload }),
  updateApplication: (id, payload) => request(`/applications/${id}`, { method: "PUT", body: payload }),
  deleteApplication: (id) => request(`/applications/${id}`, { method: "DELETE" }),

  stats: () => request("/stats"),

  linkedinOptimize: (payload) => request("/linkedin/optimize", { method: "POST", body: payload }),
};
