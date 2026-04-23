// Translations
const translations = {
  zh: {
    title_dark: "就看",
    title_accent: "5分钟",
    btn_add_site: "添加",
    btn_remove_site: "移除",
    empty_tip: "暂无网站"
  },
  en: {
    title_dark: "Just",
    title_accent: " 5 Minutes",
    btn_add_site: "Add",
    btn_remove_site: "Remove",
    empty_tip: "No sites yet"
  }
};

const currentLang = (navigator.language || '').startsWith('zh') ? 'zh' : 'en';

document.addEventListener('DOMContentLoaded', () => {
  const siteList = document.getElementById('site-list');
  let currentDomain = null;

  // Apply title
  document.querySelector('.title-dark').textContent = translations[currentLang].title_dark;
  document.querySelector('.title-accent').textContent = translations[currentLang].title_accent;

  // --- Detect Current Site ---
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0) {
      try {
        const url = tabs[0].url;
        if (url && !url.startsWith('chrome://') && !url.startsWith('edge://') && !url.startsWith('about:')) {
          currentDomain = new URL(url).hostname.replace(/^www\./, '');
        }
      } catch (e) {}
    }
    loadSites();
  });

  // --- List Rendering ---
  function loadSites() {
    chrome.storage.sync.get(['distractSites'], (result) => {
      renderList(result.distractSites || []);
    });
  }

  function renderList(sites) {
    siteList.innerHTML = '';

    if (currentDomain) {
      const isInList = sites.includes(currentDomain);
      siteList.appendChild(createItem(currentDomain, true, isInList));
    }

    const otherSites = sites.filter(s => s !== currentDomain);
    otherSites.forEach(site => {
      siteList.appendChild(createItem(site, false, true));
    });

    if (!currentDomain && otherSites.length === 0) {
      siteList.innerHTML = `<div class="empty-tip">${translations[currentLang]['empty_tip']}</div>`;
    }
  }

  function createItem(domain, isCurrent, isInList) {
    const li = document.createElement('li');
    li.className = isCurrent ? 'site-item current-site' : 'site-item';

    const domainSpan = document.createElement('span');
    domainSpan.className = 'site-domain';
    domainSpan.textContent = domain;

    const inList = isCurrent ? isInList : true;
    const actionBtn = document.createElement('button');
    actionBtn.className = inList ? 'action-btn action-remove' : 'action-btn action-add';
    actionBtn.textContent = translations[currentLang][inList ? 'btn_remove_site' : 'btn_add_site'];

    actionBtn.addEventListener('click', () => {
      if (!inList) addSite(domain);
      else removeSite(domain);
    });

    li.appendChild(domainSpan);
    li.appendChild(actionBtn);
    return li;
  }

  function addSite(domain) {
    chrome.storage.sync.get(['distractSites'], (result) => {
      const sites = result.distractSites || [];
      if (!sites.includes(domain)) {
        chrome.storage.sync.set({ distractSites: [...sites, domain] }, () => loadSites());
      }
    });
  }

  function removeSite(domain) {
    chrome.storage.sync.get(['distractSites'], (result) => {
      const sites = result.distractSites || [];
      chrome.storage.sync.set({ distractSites: sites.filter(s => s !== domain) }, () => loadSites());
    });
  }
});
