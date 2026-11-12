(function () {
  var $ = function (id) {
    return document.getElementById(id);
  };

  function render() {
    var n = Store.count(),
      full = Store.isFull(),
      app = Store.application,
      slots = Store.slots();
    var pending = Store.data.players.filter(function (p) {
      var i = Store.inviteOf(p.id);
      return i && i.status === "pending";
    }).length;

    var checks = [
      {
        ok: full,
        text: full
          ? "Усі 7 позицій заповнено"
          : "Заповнено " +
            n +
            " з 7 позицій - вільно: " +
            Store.vacantPositions().map(UI.lower).join(", "),
      },
      {
        ok: pending === 0,
        text:
          pending === 0
            ? "Немає запрошень, що очікують відповіді"
            : "Очікують відповіді: " +
              pending +
              " " +
              UI.plural(pending, "запрошення", "запрошення", "запрошень"),
      },
      {
        ok: true,
        text: "Усі гравці відповідають рівню Seniors і регіону «Південна Англія»",
      },
    ];
    $("checklist").innerHTML = checks
      .map(function (c) {
        return (
          '<li class="' +
          (c.ok ? "" : "bad") +
          '"><span class="mark">' +
          (c.ok ? "✓" : "!") +
          "</span>" +
          UI.esc(c.text) +
          "</li>"
        );
      })
      .join("");

    $("roster-body").innerHTML = slots
      .map(function (s) {
        if (!s.player)
          return (
            "<tr><td>" +
            s.position +
            '</td><td class="free">вільно</td><td>-</td><td>-</td></tr>'
          );
        var st =
          s.player.id === Store.data.captain.id
            ? "Капітан"
            : Store.inviteOf(s.player.id)
              ? s.player.f
                ? "Прийняла запрошення"
                : "Прийняв запрошення"
              : "У складі";
        return (
          "<tr><td>" +
          s.position +
          "</td><td><b>" +
          UI.esc(s.player.name) +
          "</b></td><td>" +
          s.player.age +
          "</td><td>" +
          st +
          "</td></tr>"
        );
      })
      .join("");
    $("back-link").hidden = full && !!app;
    $("sum-count").textContent = n + " / 7";

    if (!app) {
      $("confirm-box").hidden = false;
      $("status-box").hidden = true;
      $("agree").disabled = !full;
      $("agree-label").classList.toggle("off", !full);
      $("confirm-btn").disabled = !(full && $("agree").checked);
      $("confirm-hint").textContent = !full
        ? "Подати заявку можна лише за повного складу 7 / 7"
        : $("agree").checked
          ? "Після подачі склад передається організатору ліги"
          : "Позначте підтвердження, щоб подати заявку";
      return;
    }

    $("confirm-box").hidden = true;
    $("status-box").hidden = false;
    var approved = app.status === "approved";
    var cls = {
      sent: "done",
      review: approved ? "done" : "now",
      ok: approved ? "done" : "",
    };
    document.querySelectorAll("#timeline li").forEach(function (li) {
      li.className = cls[li.getAttribute("data-k")];
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    $("agree").addEventListener("change", render);
    $("confirm-btn").addEventListener("click", function () {
      if (Store.submitApplication())
        UI.toast(
          "Заявку подано",
          "Організатор ліги розгляне її найближчим часом.",
          "ok",
        );
    });
    render();
  });
  Store.on(render);
})();
