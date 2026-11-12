const S = JSON.parse(
  sessionStorage.getItem("sqrl") ||
    '{"joined":[],"declined":[],"pending":{},"app":0}',
);
const save = () => sessionStorage.setItem("sqrl", JSON.stringify(S));
const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];

const count = () => 5 + S.joined.length;
const lack = (n) =>
  "Бракує " + (7 - n) + (7 - n === 1 ? " гравця" : " гравців");
const appStatus = () =>
  S.app && Date.now() - S.app > 4000 ? "ok" : S.app ? "sent" : "";

function homePage() {
  const st = appStatus();
  $("#team-count").textContent = count() + " / 7";
  const line = $("#team-status");
  line.textContent =
    st === "ok"
      ? "Заявку підтверджено"
      : st
        ? "Заявку подано"
        : count() < 7
          ? lack(count())
          : "Склад повний - можна подати заявку";
  line.classList.toggle("ok", st === "ok");
  if (st === "ok") {
    $("#next-match").textContent = "Сб · 07:00";
    $("#next-text").textContent =
      "тиждень сортування, проти Девонських драконів";
  }
}

function schedulePage() {
  const ok = appStatus() === "ok";
  $("#sort-week").classList.toggle("hl", ok);
  $("#sort-text").innerHTML = ok
    ? "Сб 07:00 · поле 1 · Девонські дракони<small>Кваліфікаційний матч</small>"
    : "Матчі з’являться після підтвердження заявки";
}

function teamPage() {
  const rows = $$(".row");
  const freeSlots = (pos) => $$('.slot[data-pos="' + pos + '"] .free').length;
  const waiting = (pos) =>
    rows.filter((r) => S.pending[r.dataset.id] && r.dataset.pos === pos).length;

  function status(row, kind) {
    const f = row.dataset.f;
    const text = {
      wait: "Очікує відповіді",
      ok: f ? "Прийняла запрошення" : "Прийняв запрошення",
      no: f ? "Відхилила запрошення" : "Відхилив запрошення",
    };
    row.querySelector(".act").innerHTML =
      '<span class="st st-' + kind + '">' + text[kind] + "</span>";
  }

  function join(row) {
    const free = $('.slot[data-pos="' + row.dataset.pos + '"] .free');
    free.outerHTML =
      '<span class="new">' + row.querySelector("b").textContent + "</span>";
  }

  function answer(row) {
    const id = row.dataset.id;
    delete S.pending[id];
    if (row.dataset.declines) {
      S.declined.push(id);
      status(row, "no");
    } else {
      S.joined.push(id);
      status(row, "ok");
      join(row);
    }
    save();
    update();
  }

  function wait(row) {
    status(row, "wait");
    setTimeout(
      () => answer(row),
      Math.max(0, S.pending[row.dataset.id] - Date.now()),
    );
  }

  function filter() {
    const lvl = $("#f-level").value,
      reg = $("#f-region").value,
      pos = $("#f-pos").value;
    rows.forEach(
      (r) =>
        (r.hidden = !(
          r.dataset.level === lvl &&
          r.dataset.region === reg &&
          r.dataset.pos === pos
        )),
    );
    const shown = rows.filter((r) => !r.hidden);
    rows.forEach((r) =>
      r.classList.toggle("last", r === shown[shown.length - 1]),
    );
    $("#empty").hidden = shown.length > 0;
  }

  function update() {
    $$(".row button").forEach((b) => {
      const pos = b.closest(".row").dataset.pos;
      b.disabled = freeSlots(pos) - waiting(pos) <= 0;
    });
    const n = count(),
      st = appStatus(),
      btn = $("#submit"),
      hint = $("#hint");
    $("#roster-count").textContent = "Склад · " + n + " / 7";
    btn.disabled = n < 7 || !!st;
    btn.textContent = st
      ? "Заявку на тиждень сортування подано"
      : "Подати заявку на тиждень сортування";
    hint.textContent =
      st === "ok"
        ? "Заявку підтверджено - команду допущено до тижня сортування"
        : st
          ? "Заявку подано - очікує підтвердження організатора"
          : n < 7
            ? lack(n) + " - заявку можна подати лише за складу 7 / 7"
            : "Склад повний - заявку можна подати";
    hint.classList.toggle("ok", st === "ok" || (n === 7 && !st));
  }

  rows.forEach((row) => {
    const id = row.dataset.id;
    if (S.joined.includes(id)) {
      status(row, "ok");
      join(row);
    } else if (S.declined.includes(id)) status(row, "no");
    else if (S.pending[id]) wait(row);
    row.querySelector("button")?.addEventListener("click", () => {
      S.pending[id] = Date.now() + 3000;
      save();
      wait(row);
      update();
    });
  });

  $$("select").forEach((s) => s.addEventListener("change", filter));
  $("#submit").addEventListener("click", () => {
    S.app = Date.now();
    save();
    update();
    setTimeout(update, 4100);
  });
  if (appStatus() === "sent") setTimeout(update, 4100 - (Date.now() - S.app));

  filter();
  update();
}

({ home: homePage, team: teamPage, schedule: schedulePage })[
  document.body.dataset.page
]?.();
