// Translations
const translations = {
  zh: {
    overlay_title: "又来了？",
    btn_leave: "关掉网页",
    btn_allow_today: "今天放行",
    time_up_title: "⏰ 时间到了！",
    kept_word: "言而有信，不错嘛 👍"
  },
  en: {
    overlay_title: "Here again?",
    btn_leave: "Close Page",
    btn_allow_today: "Allow for today",
    time_up_title: "⏰ Time's Up!",
    kept_word: "Kept your word. Nice. 👍"
  }
};

let currentLang = (navigator.language || '').startsWith('zh') ? 'zh' : 'en';

const hostname = window.location.hostname;

function isDomainMatch(urlDomain, distractDomain) {
  return urlDomain === distractDomain || urlDomain.endsWith("." + distractDomain);
}

async function init() {
  checkStatusAndRender();
}

async function checkStatusAndRender() {
  const { distractSites } = await chrome.storage.sync.get("distractSites");
  const isDistract = distractSites && distractSites.some(site => isDomainMatch(hostname, site));

  if (!chrome.runtime?.id) return;

  try {
    chrome.runtime.sendMessage({ action: "GET_REMAINING_TIME" }, (response) => {
      if (chrome.runtime.lastError) return;

      if (isDistract) {
        if (response && response.active && response.type === "DISTRACT_SITE") {
           showFloatingTimer(response);
        } else {
           showInterventionOverlay();
        }
        return;
      }

      if (response && response.active) {
         showFloatingTimer(response);
      } else {
         const timerEl = document.getElementById("j5m-timer");
         if (timerEl) timerEl.style.display = "none";
      }
    });
  } catch(e) {}
}

function t(key) {
  return translations[currentLang][key] || key;
}

function getMinutesUntilEndOfDay() {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return Math.ceil((endOfDay - now) / 60000);
}

function isWeekendWindow() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
  const hours = now.getHours();
  return day === 6 || day === 0 || (day === 5 && hours >= 18);
}

function showOverlay({ titleKey, cardClass, smallButtons, onBind }) {
  if (document.getElementById("j5m-overlay")) return null;

  const todayMin = getMinutesUntilEndOfDay();
  const quickClass = smallButtons ? 'j5m-quick-actions j5m-quick-actions-sm' : 'j5m-quick-actions';
  const cardClassAttr = cardClass ? ` class="${cardClass}"` : '';

  const overlay = document.createElement("div");
  overlay.id = "j5m-overlay";
  overlay.innerHTML = `
    <div id="j5m-card"${cardClassAttr}>
      <div id="j5m-title">${t(titleKey)}</div>
      <div class="j5m-actions">
        <button id="j5m-btn-leave" class="j5m-btn j5m-btn-primary">${t('btn_leave')}</button>
      </div>
      <div class="${quickClass}">
        <button class="j5m-btn j5m-btn-quick" data-duration="5" title="Just 5 mins">5 min</button>
        <button class="j5m-btn j5m-btn-quick" data-duration="15" title="Just 15 mins">15 min</button>
        ${isWeekendWindow() ? `<button class="j5m-btn j5m-btn-quick" data-duration="${todayMin}">${t('btn_allow_today')}</button>` : ''}
      </div>
    </div>
  `;

  insertOverlay(overlay);
  setTimeout(() => onBind(overlay), 0);
  return overlay;
}

function showInterventionOverlay() {
  showOverlay({
    titleKey: 'overlay_title',
    onBind: bindOverlayEvents
  });
}

function showTimeUpOverlay() {
  const timerEl = document.getElementById("j5m-timer");
  if (timerEl) timerEl.style.display = "none";

  showOverlay({
    titleKey: 'time_up_title',
    cardClass: 'j5m-card-warning',
    smallButtons: true,
    onBind: bindTimeUpEvents
  });
}

function insertOverlay(overlay) {
  if (document.body) {
    document.body.appendChild(overlay);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.appendChild(overlay);
    });
  }
}

function bindOverlayEvents(overlay) {
  const btnLeave = overlay.querySelector("#j5m-btn-leave");

  btnLeave.addEventListener("click", closeTab);

  const quickBtns = overlay.querySelectorAll(".j5m-btn-quick");
  quickBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const duration = parseInt(btn.dataset.duration);
      if (isNaN(duration) || duration <= 0) return;

      chrome.runtime.sendMessage({
        action: "START_SESSION",
        duration: duration
      }, (response) => {
        if (response && response.success) {
          removeOverlay();
          showFloatingTimer({
            remaining: duration * 60,
            total: duration * 60,
            elapsed: 0
          });
        }
      });
    });
  });
}

function bindTimeUpEvents(overlay) {
  const btnLeave = overlay.querySelector("#j5m-btn-leave");

  btnLeave.addEventListener("click", showKeptWordFeedback);

  const quickBtns = overlay.querySelectorAll(".j5m-btn-quick");
  quickBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const duration = parseInt(btn.dataset.duration);
      if (isNaN(duration) || duration <= 0) return;

      chrome.runtime.sendMessage({
        action: "EXTEND_SESSION",
        duration: duration
      }, (response) => {
        if (response && response.success) {
          removeOverlay();
          try {
            chrome.runtime.sendMessage({ action: "GET_REMAINING_TIME" }, (res) => {
               if(res && res.active) showFloatingTimer(res);
            });
          } catch(e){}
        }
      });
    });
  });
}

function closeTab() {
  chrome.runtime.sendMessage({ action: "CLOSE_TAB" });
}

function showKeptWordFeedback() {
  removeOverlay();
  const overlay = document.createElement("div");
  overlay.id = "j5m-overlay";
  overlay.innerHTML = `
    <div id="j5m-card" class="j5m-card-success">
      <div id="j5m-title">${t('kept_word')}</div>
    </div>
  `;
  if (document.body) {
    document.body.appendChild(overlay);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.appendChild(overlay);
    });
  }
  setTimeout(closeTab, 2500);
}

function removeOverlay() {
  const overlay = document.getElementById("j5m-overlay");
  if (overlay) {
    overlay.remove();
  }
}

let timerInterval;

function showFloatingTimer(initialState) {
  const createTimer = () => {
    let timerEl = document.getElementById("j5m-timer");
    if (!timerEl) {
      timerEl = document.createElement("div");
      timerEl.id = "j5m-timer";

      timerEl.innerHTML = `
        <svg class="j5m-svg-ring" width="100" height="100">
          <circle class="j5m-circle-bg" cx="50" cy="50" r="40"></circle>
          <circle class="j5m-circle-progress" cx="50" cy="50" r="40"
                  stroke-dasharray="251.2" stroke-dashoffset="0"></circle>
        </svg>
        <div class="j5m-timer-content">
          <div class="j5m-time-text" id="j5m-time-text">00:00</div>
        </div>
      `;

      document.body.appendChild(timerEl);
      makeDraggable(timerEl);
    }

    timerEl.style.display = "flex";
    startTimerLogic(timerEl, initialState);
  };

  if (document.body) {
    createTimer();
  } else {
    document.addEventListener("DOMContentLoaded", createTimer);
  }
}

function startTimerLogic(timerEl, initialState) {
  let { remaining, total, elapsed } = initialState;

  const circle = timerEl.querySelector('.j5m-circle-progress');
  const timeText = timerEl.querySelector('#j5m-time-text');

  const circumference = 251.2;

  function format(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  }

  function updateDisplay() {
    if (remaining <= 0) {
      timeText.innerText = "00:00";
      circle.style.strokeDashoffset = circumference;
      return;
    }

    timeText.innerText = format(remaining);
    timeText.classList.toggle('j5m-time-long', total > 3600);

    const percentage = remaining / total;
    const offset = circumference * (1 - percentage);

    circle.style.strokeDashoffset = offset;
  }

  updateDisplay();

  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    remaining--;
    elapsed++;
    updateDisplay();

    if (remaining % 5 === 0) {
       if (!chrome.runtime?.id) {
         clearInterval(timerInterval);
         return;
       }

       try {
         chrome.runtime.sendMessage({ action: "GET_REMAINING_TIME" }, (res) => {
           if (chrome.runtime.lastError) {
             clearInterval(timerInterval);
             return;
           }

           if (res && res.active) {
             remaining = res.remaining;
             total = res.total;
             elapsed = res.elapsed;
           } else {
             clearInterval(timerInterval);
             timerEl.style.display = 'none';
           }
         });
       } catch (e) {
         clearInterval(timerInterval);
       }
    }

    if (remaining <= 0) {
      clearInterval(timerInterval);
    }
  }, 1000);
}

function makeDraggable(el) {
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  el.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = el.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    el.style.transform = 'scale(1.05)';
    el.style.right = 'auto';
    el.style.left = `${initialLeft}px`;
    el.style.top = `${initialTop}px`;
    el.style.cursor = 'grabbing';

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;

    const maxLeft = window.innerWidth - el.offsetWidth;
    const maxTop = window.innerHeight - el.offsetHeight;

    if (newLeft < 0) newLeft = 0;
    if (newLeft > maxLeft) newLeft = maxLeft;
    if (newTop < 0) newTop = 0;
    if (newTop > maxTop) newTop = maxTop;

    el.style.left = `${newLeft}px`;
    el.style.top = `${newTop}px`;
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    el.style.transform = 'scale(1)';
    el.style.cursor = 'move';
  });
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "TIME_UP") {
    showTimeUpOverlay();
  }
});

init();
