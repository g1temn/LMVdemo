/* ==========================================================
   SQRL - головна: наступний крок, стан складу, сповіщення
   ========================================================== */
(function () {
  var $ = function (id) {
    return document.getElementById(id);
  };

  var staticFeed = [
    {
      html: "Організатор ліги Гаррі Поттер відкрив прийом заявок на тиждень сортування.",
      time: "3 дні тому",
    },
    {
      html: '<span class="ok">Пенсі Паркінсон</span> приєдналася до команди.',
      time: "2 дні тому",
    },
    {
      html: '<span class="ok">Блез Забіні</span> приєднався до команди.',
      time: "учора",
    },
  ];

  function render() {
    var n = Store.count(),
      full = Store.isFull(),
      app = Store.application;
    var vacant = Store.vacantPositions();
    $("team-count").textContent = n + " / 7";

    // --- наступний крок і кроки сценарію ---
    var steps = { team: "", apply: "", ok: "" };
    var title, text, btn, href;
    if (!full) {
      var need = 7 - n;
      title =
        "Доберіть " +
        need +
        " " +
        UI.plural(need, "гравця", "гравців", "гравців") +
        " у команду";
      text =
        "Вільні позиції: " +
        vacant.map(UI.lower).join(", ") +
        ". Знайдіть гравців свого рівня та регіону й надішліть їм запрошення.";
      btn = "Зібрати команду";
      href = "team/index.html";
      steps.team = "current";
    } else if (!app) {
      title = "Подайте заявку на тиждень сортування";
      text = "Склад повний - перевірте його та підтвердьте подачу заявки.";
      btn = "Перейти до заявки";
      href = "application/index.html";
      steps.team = "done";
      steps.apply = "current";
    } else if (app.status === "review") {
      title = "Заявка на розгляді в організатора";
      text =
        "Зазвичай перевірка триває кілька хвилин. Статус оновиться автоматично.";
      btn = "Переглянути статус заявки";
      href = "application/index.html";
      steps.team = "done";
      steps.apply = "done";
      steps.ok = "current";
    } else {
      title = "Команду допущено до тижня сортування";
      text = "Розклад кваліфікаційних матчів з’явиться після жеребкування.";
      btn = "Переглянути заявку";
      href = "application/index.html";
      steps.team = "done";
      steps.apply = "done";
      steps.ok = "done";
    }
    $("next-title").textContent = title;
    $("next-text").textContent = text;
    $("next-btn").textContent = btn;
    $("next-btn").setAttribute("href", href);

    var sub = {
      team: full ? "Повний · 7 / 7" : n + " / 7 · бракує " + (7 - n),
      apply: !app ? (full ? "Готова до подачі" : "Не подано") : "Подано",
      ok: !app
        ? "Очікує заявки"
        : app.status === "review"
          ? "На розгляді"
          : "Підтверджено",
    };
    document.querySelectorAll("#stepper li").forEach(function (li) {
      var k = li.getAttribute("data-step");
      li.className = steps[k];
      li.querySelector("small").textContent = sub[k];
    });

    // --- склад за позиціями ---
    var pendingByPos = {};
    Store.data.players.forEach(function (p) {
      var inv = Store.inviteOf(p.id);
      if (inv && inv.status === "pending")
        (pendingByPos[p.position] = pendingByPos[p.position] || []).push(
          p.name,
        );
    });
    $("slot-list").innerHTML = Store.slots()
      .map(function (s) {
        var right;
        if (s.player) right = "<b>" + UI.esc(s.player.name) + "</b>";
        else if (pendingByPos[s.position] && pendingByPos[s.position].length)
          right =
            '<span class="wait">очікує: ' +
            UI.esc(pendingByPos[s.position].shift()) +
            "</span>";
        else right = '<span class="free">вільно</span>';
        return "<li><span>" + s.position + "</span>" + right + "</li>";
      })
      .join("");

    // --- сповіщення ---
    var dyn = Store.events.map(function (e) {
      var p = e.id ? Store.player(e.id) : null,
        h;
      if (e.type === "accepted")
        h =
          '<span class="ok">' +
          UI.esc(p.name) +
          "</span> " +
          (p.f ? "прийняла" : "прийняв") +
          " запрошення на позицію «" +
          UI.lower(p.position) +
          "».";
      if (e.type === "declined")
        h =
          '<span class="no">' +
          UI.esc(p.name) +
          "</span> " +
          (p.f ? "відхилила" : "відхилив") +
          " запрошення.";
      if (e.type === "submitted") h = "Заявку на тиждень сортування подано.";
      if (e.type === "approved")
        h =
          '<span class="ok">Заявку підтверджено</span> - команду допущено до тижня сортування.';
      return { html: h, time: "щойно" };
    });
    $("feed").innerHTML = dyn
      .concat(staticFeed.slice().reverse())
      .map(function (f) {
        return "<li>" + f.html + "<time>" + f.time + "</time></li>";
      })
      .join("");
  }

  document.addEventListener("DOMContentLoaded", render);
  Store.on(render);
})();
