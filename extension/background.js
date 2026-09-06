// Minimal service worker — reserved for future work (e.g. a right-click
// "Save job to JobBoard Pro" context menu, or badge counts). Kept intentionally
// small since all current logic lives in popup.js + content.js.

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "jbp-capture-job",
    title: "Capture this job to JobBoard Pro",
    contexts: ["page"],
  });
});

chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "jbp-capture-job" || !tab?.id) return;
  const { token, serverUrl } = await chrome.storage.local.get(["token", "serverUrl"]);
  if (!token) {
    chrome.action.openPopup?.();
    return;
  }
  const base = serverUrl || "http://127.0.0.1:8000";
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__jbpExtractJob__ ? window.__jbpExtractJob__() : null,
    });
    if (!result || !result.title) return;
    await fetch(base + "/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({
        company: result.company || "Unknown company",
        title: result.title,
        location: result.location || "",
        job_url: tab.url,
        source: "extension",
        description: result.description || "",
        status: "saved",
      }),
    });
    chrome.action.setBadgeText({ text: "✓", tabId: tab.id });
    setTimeout(() => chrome.action.setBadgeText({ text: "", tabId: tab.id }), 3000);
  } catch (e) {
    console.error("JobBoard Pro capture failed:", e);
  }
});
