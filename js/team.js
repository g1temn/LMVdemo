/* ==========================================================
   SQRL - «Моя команда»: фільтри, запрошення, склад, перехід до заявки
   ========================================================== */
(function () {
  var D = Store.data;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var fresh = null;

  function fillSelect(sel, values, current) {
    sel.innerHTML = values
      .map(function (v) {
        var val = typeof v === "string" ? v : v.value,
          txt = typeof v === "string" ? v : v.text;
        return (
          '<option value="' +
          val +
          '"' +
          (val === current ? " selected" : "") +
          ">" +
          txt +
          "</option>"
        );
      })
      .join("");
  }
  function positionOptions() {
    var cur = $("f-position").value;
    var opts = [{ value: "", text: "Усі позиції" }].concat(
      D.positions.map(function (p) {
        var free = Store.freeSlots(p);
        return {
          value: p,
          text: p + (free ? " · вільно " + free : " · зайнято"),
        };
      }),
    );
    fillSelect($("f-position"), opts, cur);
  }

  function candidates() {
    var lvl = $("f-level").value,
      reg = $("f-region").value,
      pos = $("f-position").value;
    return D.players.filter(function (p) {
      return (
        D.startRoster.indexOf(p.id) < 0 &&
        p.level === lvl &&
        p.region === reg &&
        (!pos || p.position === pos)
      );
    });
  }

  function actionHtml(p) {
    var inv = Store.inviteOf(p.id);
    if (inv && inv.status === "accepted")
      return (
        '<span class="status status-ok"><span class="dot"></span>' +
        (p.f ? "Прийняла" : "Прийняв") +
        " запрошення</span>"
      );
    if (inv && inv.status === "pending")
      return '<span class="status status-wait"><span class="dot"></span>Очікує відповіді</span>';
    if (inv && inv.status === "declined")
      return (
        '<span class="status status-no"><span class="dot"></span>' +
        (p.f ? "Відхилила" : "Відхилив") +
        " запрошення</span>"
      );
    if (Store.isFull() || Store.openFor(p.position) === 0) {
      var why = Store.freeSlots(p.position)
        ? "Вільне місце вже очікує відповіді"
        : "Позицію вже заповнено";
      return (
        '<button class="btn btn-outline" type="button" disabled title="' +
        why +
        '">Запросити</button>'
      );
    }
    return (
      '<button class="btn btn-outline" type="button" data-invite="' +
      p.id +
      '">Запросити</button>'
    );
  }

  function renderResults() {
    var list = candidates(),
      pos = $("f-position").value;
    $("result-count").textContent =
      "Знайдено " +
      list.length +
      " " +
      UI.plural(list.length, "гравця", "гравців", "гравців");

    var note = $("position-note");
    if (Store.isFull()) {
      note.textContent = "Склад повний - нові запрошення не потрібні";
      note.className = "position-note open";
    } else if (!pos) {
      note.textContent =
        "Вільні позиції: " + Store.vacantPositions().map(UI.lower).join(", ");
      note.className = "position-note";
    } else if (Store.openFor(pos) > 0) {
      note.textContent = "Можна запросити ще: " + Store.openFor(pos);
      note.className = "position-note open";
    } else if (Store.freeSlots(pos) > 0) {
      note.textContent = "Вільне місце очікує відповіді гравця";
      note.className = "position-note closed";
    } else {
      note.textContent = "Позицію «" + UI.lower(pos) + "» уже заповнено";
      note.className = "position-note closed";
    }

    if (!list.length) {
      $("results").innerHTML =
        '<li class="empty"><b>Немає гравців за цими фільтрами</b>Спробуйте інший рівень, регіон або позицію.</li>';
      return;
    }
    $("results").innerHTML = list
      .map(function (p) {
        return (
          '<li class="player" id="p-' +
          p.id +
          '">' +
          '<span class="avatar">' +
          UI.initials(p.name) +
          "</span>" +
          '<div><div class="player-name">' +
          UI.esc(p.name) +
          "</div>" +
          '<div class="player-meta">' +
          p.age +
          " " +
          UI.plural(p.age, "рік", "роки", "років") +
          " · " +
          UI.lower(p.position) +
          " · " +
          p.level +
          "</div>" +
          (p.note
            ? '<div class="player-note">' + UI.esc(p.note) + "</div>"
            : "") +
          "</div>" +
          '<div class="action">' +
          actionHtml(p) +
          "</div></li>"
        );
      })
      .join("");
  }

  function renderRoster() {
    var n = Store.count(),
      full = Store.isFull(),
      app = Store.application;
    $("roster-counter").innerHTML = n + "<small> / 7</small>";
    $("roster-counter").classList.toggle("full", full);
    $("progress-bar").style.width = (n / 7) * 100 + "%";
    $("progress-bar").classList.toggle("full", full);

    var pending = {};
    D.players.forEach(function (p) {
      var inv = Store.inviteOf(p.id);
      if (inv && inv.status === "pending")
        (pending[p.position] = pending[p.position] || []).push(p.name);
    });
    $("slots").innerHTML = Store.slots()
      .map(function (s) {
        var mid,
          tag = "";
        if (s.player) {
          mid =
            '<span class="slot-name' +
            (s.player.id === D.captain.id ? " cap" : "") +
            '">' +
            UI.esc(s.player.name) +
            "</span>";
          if (Store.inviteOf(s.player.id))
            tag = '<span class="slot-tag ok">новий</span>';
        } else if (pending[s.position] && pending[s.position].length) {
          mid =
            '<span class="slot-wait">очікує відповіді: ' +
            UI.esc(pending[s.position].shift()) +
            "</span>";
        } else {
          mid =
            '<button class="slot-free" type="button" data-pos="' +
            s.position +
            '" title="Знайти гравця на цю позицію">вільно</button>';
        }
        var isNew = s.player && s.player.id === fresh;
        return (
          '<li class="slot' +
          (isNew ? " new" : "") +
          '"><span class="slot-pos">' +
          s.position +
          "</span>" +
          mid +
          tag +
          "</li>"
        );
      })
      .join("");
    fresh = null;

    // 4. Подати заявку: кнопка активна лише за складу 7 / 7
    if (app) {
      $("submit-box").innerHTML =
        '<div class="submitted"><b>' +
        (app.status === "approved" ? "Заявку підтверджено" : "Заявку подано") +
        "</b>" +
        "<span>" +
        (app.status === "approved"
          ? "Команду допущено до тижня сортування."
          : "Заявка на розгляді в організатора ліги.") +
        "</span>" +
        '<a href="../application/index.html">Переглянути статус заявки</a></div>';
      return;
    }
    $("submit-btn").disabled = !full;
    var hint = $("submit-hint"),
      vac = Store.vacantPositions(),
      need = 7 - n;
    if (full) {
      hint.textContent = "Склад повний - заявку можна подати";
      hint.className = "submit-hint ok";
    } else {
      hint.textContent =
        "Бракує " +
        need +
        " " +
        UI.plural(need, "гравця", "гравців", "гравців") +
        ": " +
        vac.map(UI.lower).join(", ");
      hint.className = "submit-hint";
    }
  }

  function render() {
    positionOptions();
    renderResults();
    renderRoster();
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Рівень і регіон - з профілю капітана; позиція - перша вільна
    fillSelect($("f-level"), D.levels, D.captain.level);
    fillSelect($("f-region"), D.regions, D.captain.region);
    positionOptions();
    $("f-position").value = Store.vacantPositions()[0] || "";

    $("filters").addEventListener("change", function () {
      positionOptions();
      renderResults();
    });

    $("results").addEventListener("click", function (e) {
      var b = e.target.closest("[data-invite]");
      if (!b) return;
      var p = Store.player(b.getAttribute("data-invite"));
      if (Store.invite(p.id))
        UI.toast(
          "Запрошення надіслано",
          p.name +
            " отримав" +
            (p.f ? "ла" : "") +
            " запрошення до «Вілтширських виверн».",
        );
    });

    // Натискання «вільно» в складі встановлює фільтр позиції
    $("slots").addEventListener("click", function (e) {
      var b = e.target.closest("[data-pos]");
      if (!b) return;
      $("f-level").value = D.captain.level;
      $("f-region").value = D.captain.region;
      $("f-position").value = b.getAttribute("data-pos");
      renderResults();
      $("f-position").focus();
    });

    $("submit-btn").addEventListener("click", function () {
      if (Store.isFull()) location.href = "../application/index.html";
    });

    render();
  });

  Store.on(function (e) {
    if (e.type === "accepted") fresh = e.player.id;
    render();
  });
})();
