// Default distract list
const DEFAULT_DISTRACT_SITES = [
  "youtube.com",
  "x.com",
  "instagram.com",
  "threads.com",
  "bsky.app",
  "mastodon.social",
  "zhihu.com",
  "bilibili.com"
];

// Init default distract sites on first install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["distractSites"], (result) => {
    if (!result.distractSites) {
      chrome.storage.sync.set({ distractSites: DEFAULT_DISTRACT_SITES });
    }
  });
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_CURRENT_TAB_STATUS") {
    getCurrentTabStatus(sendResponse);
    return true;
  }
  if (request.action === "STOP_SESSION") {
    handleStopSession(request.tabId, sendResponse);
    return true;
  }

  const tabId = sender.tab ? sender.tab.id : null;

  if (request.action === "START_SESSION") {
    handleStartSession(tabId, request.duration, sendResponse);
    return true;
  } else if (request.action === "GET_REMAINING_TIME") {
    handleGetTime(tabId, sendResponse);
    return true;
  } else if (request.action === "ADD_DISTRACT_SITE") {
    addDistractSite(request.domain, sendResponse);
    return true;
  } else if (request.action === "EXTEND_SESSION") {
    handleExtendSession(tabId, request.duration, sendResponse);
    return true;
  } else if (request.action === "CLOSE_TAB") {
    handleCloseTab(tabId);
    return false;
  }
});

let activeSessions = {};

function handleStartSession(tabId, durationMinutes, sendResponse) {
  const now = Date.now();
  const endTime = now + durationMinutes * 60 * 1000;
  activeSessions[tabId] = {
    startTime: now,
    endTime: endTime
  };
  chrome.alarms.create(`session_${tabId}`, { when: endTime });
  sendResponse({ success: true, endTime: endTime });
}

function handleStopSession(tabId, sendResponse) {
  if (activeSessions[tabId]) {
    delete activeSessions[tabId];
    chrome.alarms.clear(`session_${tabId}`);

    chrome.tabs.create({ url: "chrome://newtab" }, () => {
      chrome.tabs.remove(tabId).catch(() => {});
    });
  }
  sendResponse({ success: true });
}

function handleExtendSession(tabId, durationMinutes, sendResponse) {
  const session = activeSessions[tabId];
  const now = Date.now();
  if (session) {
    const newEndTime = Math.max(session.endTime, now) + durationMinutes * 60 * 1000;
    session.endTime = newEndTime;
    chrome.alarms.create(`session_${tabId}`, { when: newEndTime });
    sendResponse({ success: true, endTime: newEndTime });
  } else {
    handleStartSession(tabId, durationMinutes, sendResponse);
  }
}

function handleCloseTab(tabId) {
  if (tabId) {
    chrome.tabs.create({ url: "chrome://newtab" }, () => {
      chrome.tabs.remove(tabId).catch(() => {});
    });
    if (activeSessions[tabId]) {
      delete activeSessions[tabId];
      chrome.alarms.clear(`session_${tabId}`);
    }
  }
}

function handleGetTime(tabId, sendResponse) {
  const now = Date.now();
  const session = activeSessions[tabId];
  if (session) {
    const total = Math.floor((session.endTime - session.startTime) / 1000);
    const elapsed = Math.floor((now - session.startTime) / 1000);
    const remaining = Math.max(0, Math.floor((session.endTime - now) / 1000));

    sendResponse({
      active: true,
      type: "DISTRACT_SITE",
      remaining,
      total,
      elapsed
    });
    return;
  }

  sendResponse({ remaining: 0, active: false });
}

async function getCurrentTabStatus(sendResponse) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab && activeSessions[tab.id]) {
    const session = activeSessions[tab.id];
    const now = Date.now();
    sendResponse({
      type: "DISTRACT_SITE",
      active: true,
      tabId: tab.id,
      elapsed: Math.floor((now - session.startTime) / 1000),
      remaining: Math.max(0, Math.floor((session.endTime - now) / 1000)),
      totalLimit: Math.floor((session.endTime - session.startTime) / 1000),
      domain: new URL(tab.url).hostname
    });
    return;
  }

  sendResponse({ active: false });
}

function addDistractSite(domain, sendResponse) {
  chrome.storage.sync.get(["distractSites"], (result) => {
    const sites = result.distractSites || DEFAULT_DISTRACT_SITES;
    if (!sites.includes(domain)) {
      const newSites = [...sites, domain];
      chrome.storage.sync.set({ distractSites: newSites }, () => {
        sendResponse({ success: true, sites: newSites });
      });
    } else {
      sendResponse({ success: true, sites: sites });
    }
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith("session_")) {
    const tabId = parseInt(alarm.name.split("_")[1]);
    chrome.tabs.sendMessage(tabId, { action: "TIME_UP" }).catch(() => {
      if (activeSessions[tabId]) delete activeSessions[tabId];
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeSessions[tabId]) {
    delete activeSessions[tabId];
    chrome.alarms.clear(`session_${tabId}`);
  }
});
