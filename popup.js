const STORAGE_KEYS = {
  schedule: 'offtime-schedule',
  theme: 'offtime-theme'
};

const DEFAULT_SCHEDULE = {
  startDay: 0,
  endDay: 4,
  startTime: '10:00',
  endTime: '19:00'
};

const DEFAULT_THEME = 'dark';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

let currentSchedule = { ...DEFAULT_SCHEDULE };

function loadSchedule() {
  return new Promise((resolve) => {
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      resolve({ ...DEFAULT_SCHEDULE });
      return;
    }

    chrome.storage.local.get(STORAGE_KEYS.schedule, (result) => {
      const savedSchedule = result[STORAGE_KEYS.schedule] || {};
      resolve({ ...DEFAULT_SCHEDULE, ...savedSchedule });
    });
  });
}

function loadTheme() {
  return new Promise((resolve) => {
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      resolve(DEFAULT_THEME);
      return;
    }

    chrome.storage.local.get(STORAGE_KEYS.theme, (result) => {
      resolve(result[STORAGE_KEYS.theme] || DEFAULT_THEME);
    });
  });
}

function saveSchedule(schedule) {
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ [STORAGE_KEYS.schedule]: schedule });
  }
}

function saveTheme(theme) {
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ [STORAGE_KEYS.theme]: theme });
  }
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  const themeButton = document.getElementById('themeBtn');
  themeButton.textContent = theme === 'dark' ? '☀' : '🌙';
  themeButton.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
}

function formatHour(value) {
  const [hourString, minuteString] = value.split(':');
  const hour = Number(hourString);
  const minute = Number(minuteString);
  const period = hour >= 12 ? 'PM' : 'AM';
  const normalizedHour = hour % 12 || 12;
  const minuteText = minute.toString().padStart(2, '0');

  return `${normalizedHour}:${minuteText} ${period}`;
}

function buildDayTime(reference, timeValue) {
  const [hours, minutes] = timeValue.split(':').map(Number);
  const target = new Date(reference);
  target.setHours(hours, minutes, 0, 0);
  return target;
}

function timeToMinutes(timeValue) {
  const [hours, minutes] = timeValue.split(':').map(Number);
  return hours * 60 + minutes;
}

function isOfficeDay(day, schedule) {
  const start = Number(schedule.startDay);
  const end = Number(schedule.endDay);

  if (start <= end) {
    return day >= start && day <= end;
  }

  return day >= start || day <= end;
}

function getNextTarget(now, schedule) {
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeToMinutes(schedule.startTime);
  const endMinutes = timeToMinutes(schedule.endTime);

  if (isOfficeDay(currentDay, schedule)) {
    if (currentMinutes < startMinutes) {
      return buildDayTime(now, schedule.startTime);
    }

    if (currentMinutes < endMinutes) {
      return buildDayTime(now, schedule.endTime);
    }
  }

  const scanDate = new Date(now);
  scanDate.setHours(0, 0, 0, 0);

  for (let offset = 1; offset <= 14; offset += 1) {
    const candidate = new Date(scanDate);
    candidate.setDate(candidate.getDate() + offset);

    if (isOfficeDay(candidate.getDay(), schedule)) {
      return buildDayTime(candidate, schedule.startTime);
    }
  }

  return buildDayTime(now, schedule.startTime);
}

function getProgressPercent(now) {
  const startMinutes = timeToMinutes(currentSchedule.startTime);
  const endMinutes = timeToMinutes(currentSchedule.endTime);
  const totalMinutes = Math.max(1, endMinutes - startMinutes);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (!isOfficeDay(now.getDay(), currentSchedule)) {
    return 0;
  }

  if (currentMinutes < startMinutes) {
    return 0;
  }

  if (currentMinutes >= endMinutes) {
    return 100;
  }

  const elapsedMinutes = currentMinutes - startMinutes;
  return Math.min(100, Math.max(0, (elapsedMinutes / totalMinutes) * 100));
}

function formatCountdown(remainingMs) {
  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function renderSummary(schedule) {
  const start = DAYS[schedule.startDay];
  const end = DAYS[schedule.endDay];
  document.getElementById('scheduleSummary').textContent = `${start} to ${end} · ${formatHour(schedule.startTime)} to ${formatHour(schedule.endTime)}`;
}

function populateSelectors(schedule) {
  const startSelect = document.getElementById('startDay');
  const endSelect = document.getElementById('endDay');

  startSelect.innerHTML = '';
  endSelect.innerHTML = '';

  DAYS.forEach((day, index) => {
    const startOption = document.createElement('option');
    startOption.value = String(index);
    startOption.textContent = day;

    const endOption = document.createElement('option');
    endOption.value = String(index);
    endOption.textContent = day;

    startSelect.appendChild(startOption);
    endSelect.appendChild(endOption);
  });

  startSelect.value = String(schedule.startDay);
  endSelect.value = String(schedule.endDay);
  document.getElementById('startTime').value = schedule.startTime;
  document.getElementById('endTime').value = schedule.endTime;
}

function updateCountdown() {
  const now = new Date();
  const target = getNextTarget(now, currentSchedule);
  const remainingMs = Math.max(0, target.getTime() - now.getTime());

  document.getElementById('clock').textContent = formatCountdown(remainingMs);
  document.getElementById('progressFill').style.width = `${getProgressPercent(now)}%`;
}

function saveCurrentSettings() {
  const schedule = {
    startDay: Number(document.getElementById('startDay').value),
    endDay: Number(document.getElementById('endDay').value),
    startTime: document.getElementById('startTime').value,
    endTime: document.getElementById('endTime').value
  };

  currentSchedule = schedule;
  saveSchedule(schedule);
  renderSummary(schedule);
  updateCountdown();
}

async function init() {
  currentSchedule = await loadSchedule();
  const theme = await loadTheme();

  populateSelectors(currentSchedule);
  renderSummary(currentSchedule);
  applyTheme(theme);
  updateCountdown();

  document.getElementById('themeBtn').addEventListener('click', () => {
    const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    saveTheme(nextTheme);
    applyTheme(nextTheme);
    updateCountdown();
  });

  document.getElementById('settingsBtn').addEventListener('click', () => {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('hidden');
  });

  document.getElementById('saveBtn').addEventListener('click', saveCurrentSettings);

  window.setInterval(updateCountdown, 1000);
}

init();