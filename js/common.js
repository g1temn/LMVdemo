/* ==========================================================
   SQRL - спільна поведінка: сповіщення, заглушки, скидання демо
   ========================================================== */
var UI = (function () {
  var box;
  function toast(title, text, kind) {
    if (!box) {
      box = document.createElement("div");
      box.className = "toasts";
      box.setAttribute("aria-live", "polite");
      document.body.appendChild(box);
    }
    var t = document.createElement("div");
    t.className = "toast" + (kind ? " " + kind : "");
    t.innerHTML = "<b></b><span></span>";
    t.querySelector("b").textContent = title;
    t.querySelector("span").textContent = text || "";
    box.appendChild(t);
    setTimeout(function () {
      t.classList.add("leave");
      setTimeout(function () {
        t.remove();
      }, 320);
    }, 4200);
  }
  function plural(n, one, few, many) {
    var m10 = n % 10,
      m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }
  function initials(name) {
    return name
      .split(" ")
      .map(function (w) {
        return w[0];
      })
      .join("")
      .slice(0, 2);
  }
  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
  function lower(s) {
    return s.charAt(0).toLowerCase() + s.slice(1);
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Нереалізовані елементи: підказка при наведенні + сповіщення при натисканні
    document.querySelectorAll("[data-soon]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        toast("Не реалізовано в прототипі", el.getAttribute("data-soon"));
      });
    });
    var r = document.getElementById("reset-demo");
    if (r)
      r.addEventListener("click", function () {
        Store.reset();
        location.reload();
      });
  });

  // Сповіщення про відповіді гравців на будь-якій сторінці
  Store.on(function (e) {
    if (e.type === "accepted")
      toast(
        e.player.name + (e.player.f ? " прийняла" : " прийняв") + " запрошення",
        "Позицію «" +
          lower(e.player.position) +
          "» зайнято. Склад: " +
          Store.count() +
          " / 7.",
        "ok",
      );
    if (e.type === "declined")
      toast(
        e.player.name +
          (e.player.f ? " відхилила" : " відхилив") +
          " запрошення",
        "Позиція «" +
          lower(e.player.position) +
          "» знову вільна - оберіть іншого гравця.",
        "no",
      );
    if (e.type === "approved")
      toast(
        "Заявку підтверджено",
        "Команду допущено до тижня сортування.",
        "ok",
      );
  });

  return {
    toast: toast,
    plural: plural,
    initials: initials,
    esc: esc,
    lower: lower,
  };
})();
