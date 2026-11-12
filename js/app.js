// ---------- Стан прототипу ----------
// Зберігається в sessionStorage, щоб не губитися при переході між сторінками.

const STORAGE_KEY = 'sqrl';
const START_PLAYERS = 5;
const TEAM_SIZE = 7;
const ANSWER_DELAY = 3000;
const APPROVE_DELAY = 4000;

function loadState() {
  const saved = sessionStorage.getItem(STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    joined: [],          // гравці, які прийняли запрошення
    declined: [],        // гравці, які відхилили запрошення
    pending: {},         // гравці, які ще думають: id -> час відповіді
    applicationTime: 0   // коли подано заявку (0 - ще не подано)
  };
}

function saveState() {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetState() {
  sessionStorage.removeItem(STORAGE_KEY);
  location.reload();
}

const state = loadState();

function teamSize() {
  return START_PLAYERS + state.joined.length;
}

function missingText() {
  const missing = TEAM_SIZE - teamSize();
  if (missing === 1) {
    return 'Бракує 1 гравця';
  }
  return 'Бракує ' + missing + ' гравців';
}

// Повертає '', 'sent' (подано) або 'approved' (підтверджено)
function applicationStatus() {
  if (!state.applicationTime) {
    return '';
  }
  const passed = Date.now() - state.applicationTime;
  if (passed > APPROVE_DELAY) {
    return 'approved';
  }
  return 'sent';
}


// ---------- Головна ----------

function initHomePage() {
  const status = applicationStatus();
  const statusLine = document.getElementById('team-status');

  document.getElementById('team-count').textContent = teamSize() + ' / 7';

  if (status === 'approved') {
    statusLine.textContent = 'Заявку підтверджено';
    statusLine.classList.add('ok');
    document.getElementById('next-match').textContent = 'Сб · 07:00';
    document.getElementById('next-text').textContent = 'тиждень сортування, проти Девонських драконів';
  } else if (status === 'sent') {
    statusLine.textContent = 'Заявку подано';
  } else if (teamSize() < TEAM_SIZE) {
    statusLine.textContent = missingText();
  } else {
    statusLine.textContent = 'Склад повний - можна подати заявку';
  }
}


// ---------- Розклад ----------

function initSchedulePage() {
  if (applicationStatus() !== 'approved') {
    return;
  }
  document.getElementById('sort-week').classList.add('hl');
  document.getElementById('sort-text').innerHTML =
    'Сб 07:00 · поле 1 · Девонські дракони<small>Кваліфікаційний матч</small>';
}


// ---------- Моя команда ----------

function initTeamPage() {
  const rows = document.querySelectorAll('.row');

  // Показуємо тільки гравців, які підходять під фільтри
  function applyFilters() {
    const level = document.getElementById('f-level').value;
    const region = document.getElementById('f-region').value;
    const position = document.getElementById('f-pos').value;
    let lastVisible = null;

    rows.forEach(function (row) {
      const fits = row.dataset.level === level
        && row.dataset.region === region
        && row.dataset.pos === position;
      row.hidden = !fits;
      row.classList.remove('last');
      if (fits) {
        lastVisible = row;
      }
    });

    if (lastVisible) {
      lastVisible.classList.add('last');
    }
    document.getElementById('empty').hidden = lastVisible !== null;
  }

  // Скільки місць на позиції ще можна запропонувати
  function openPlaces(position) {
    const freeSlots = document.querySelectorAll('.slot[data-pos="' + position + '"] .free').length;
    let waiting = 0;
    rows.forEach(function (row) {
      if (row.dataset.pos === position && state.pending[row.dataset.id]) {
        waiting++;
      }
    });
    return freeSlots - waiting;
  }

  // Замінює кнопку «Запросити» на текстовий статус
  function showStatus(row, kind) {
    const female = row.dataset.f;
    let text = 'Очікує відповіді';
    if (kind === 'ok') {
      text = female ? 'Прийняла запрошення' : 'Прийняв запрошення';
    }
    if (kind === 'no') {
      text = female ? 'Відхилила запрошення' : 'Відхилив запрошення';
    }
    row.querySelector('.act').innerHTML = '<span class="st st-' + kind + '">' + text + '</span>';
  }

  // Ставить гравця на перше вільне місце його позиції
  function addToRoster(row) {
    const freeSlot = document.querySelector('.slot[data-pos="' + row.dataset.pos + '"] .free');
    const name = row.querySelector('b').textContent;
    freeSlot.outerHTML = '<span class="new">' + name + '</span>';
  }

  // Гравець відповідає на запрошення
  function receiveAnswer(row) {
    const id = row.dataset.id;
    delete state.pending[id];

    if (row.dataset.declines) {
      state.declined.push(id);
      showStatus(row, 'no');
    } else {
      state.joined.push(id);
      showStatus(row, 'ok');
      addToRoster(row);
    }

    saveState();
    updatePage();
  }

  function waitForAnswer(row) {
    showStatus(row, 'wait');
    const timeLeft = state.pending[row.dataset.id] - Date.now();
    setTimeout(function () {
      receiveAnswer(row);
    }, Math.max(0, timeLeft));
  }

  function sendInvite(row) {
    state.pending[row.dataset.id] = Date.now() + ANSWER_DELAY;
    saveState();
    waitForAnswer(row);
    updatePage();
  }

  function submitApplication() {
    state.applicationTime = Date.now();
    saveState();
    updatePage();
    setTimeout(updatePage, APPROVE_DELAY + 100);
  }

  // Оновлює кнопки, лічильник складу і підказку під кнопкою заявки
  function updatePage() {
    const size = teamSize();
    const status = applicationStatus();
    const submitButton = document.getElementById('submit');
    const hint = document.getElementById('hint');

    document.querySelectorAll('.row button').forEach(function (button) {
      const position = button.closest('.row').dataset.pos;
      button.disabled = openPlaces(position) <= 0;
    });

    document.getElementById('roster-count').textContent = 'Склад · ' + size + ' / 7';

    submitButton.disabled = size < TEAM_SIZE || status !== '';
    if (status === '') {
      submitButton.textContent = 'Подати заявку на тиждень сортування';
    } else {
      submitButton.textContent = 'Заявку на тиждень сортування подано';
    }

    hint.classList.remove('ok');
    if (status === 'approved') {
      hint.textContent = 'Заявку підтверджено - команду допущено до тижня сортування';
      hint.classList.add('ok');
    } else if (status === 'sent') {
      hint.textContent = 'Заявку подано - очікує підтвердження організатора';
    } else if (size < TEAM_SIZE) {
      hint.textContent = missingText() + ' - заявку можна подати лише за складу 7 / 7';
    } else {
      hint.textContent = 'Склад повний - заявку можна подати';
      hint.classList.add('ok');
    }
  }

  // Відновлюємо те, що вже відбулося, і підключаємо кнопки
  rows.forEach(function (row) {
    const id = row.dataset.id;

    if (state.joined.includes(id)) {
      showStatus(row, 'ok');
      addToRoster(row);
    } else if (state.declined.includes(id)) {
      showStatus(row, 'no');
    } else if (state.pending[id]) {
      waitForAnswer(row);
    } else {
      row.querySelector('button').addEventListener('click', function () {
        sendInvite(row);
      });
    }
  });

  document.querySelectorAll('.filters select').forEach(function (select) {
    select.addEventListener('change', applyFilters);
  });
  document.getElementById('submit').addEventListener('click', submitApplication);

  if (applicationStatus() === 'sent') {
    const timeLeft = state.applicationTime + APPROVE_DELAY - Date.now();
    setTimeout(updatePage, timeLeft + 100);
  }

  applyFilters();
  updatePage();
}


// ---------- Запуск ----------

document.getElementById('reset').addEventListener('click', resetState);

const page = document.body.dataset.page;
if (page === 'home') initHomePage();
if (page === 'team') initTeamPage();
if (page === 'schedule') initSchedulePage();
