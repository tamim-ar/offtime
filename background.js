const BADGE_ALARM_NAME = 'offtime-badge-refresh';
const DEFAULT_TARGET_HOUR = 19;
const DEFAULT_TARGET_MINUTE = 0;

let isInitialized = false;

function getNextTargetDate(now) {
  const target = new Date(now);
  target.setHours(DEFAULT_TARGET_HOUR, DEFAULT_TARGET_MINUTE, 0, 0);

  if (now >= target) {
    target.setDate(target.getDate() + 1);
  }

  return target;
}

function formatBadgeText(remainingMs) {
  const totalMinutes = Math.max(0, Math.floor(remainingMs / 60000));

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    return `${hours}h`;
  }

  if (totalMinutes > 0) {
    return `${totalMinutes}m`;
  }

  return '0m';
}

function updateBadge() {
  try {
    const now = new Date();
    const target = getNextTargetDate(now);
    const remainingMs = Math.max(0, target.getTime() - now.getTime());

    chrome.action.setBadgeText({ text: formatBadgeText(remainingMs) });
    chrome.action.setBadgeBackgroundColor({ color: '#1976D2' });
    chrome.action.setTitle({
      title: `Time left until 7:00 PM: ${new Date(remainingMs).toISOString().slice(11, 19)}`
    });
  } catch (error) {
    console.error('Offtime badge update failed:', error);
  }
}

function initializeBackground() {
  if (isInitialized) {
    return;
  }

  isInitialized = true;

  try {
    chrome.runtime.onInstalled.addListener(() => {
      chrome.alarms.create(BADGE_ALARM_NAME, { periodInMinutes: 1 });
      updateBadge();
    });

    chrome.runtime.onStartup.addListener(() => {
      updateBadge();
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === BADGE_ALARM_NAME) {
        updateBadge();
      }
    });

    chrome.alarms.create(BADGE_ALARM_NAME, { periodInMinutes: 1 });
    updateBadge();
  } catch (error) {
    console.error('Offtime background initialization failed:', error);
  }
}

initializeBackground();