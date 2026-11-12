var Store = (function () {
  var KEY = "sqrl-lab3-state";
  var D = SQRL_DATA;
  var listeners = [];
  var timers = {};

  function fresh() {
    return {
      roster: D.startRoster.slice(), // id гравців у складі
      invites: {}, // id -> {status: 'pending'|'accepted'|'declined', due: мс}
      application: null, // null | {status: 'review'|'approved', at: мс}
      events: [], // журнал для сповіщень на головній
    };
  }
  function load() {
    try {
      var s = JSON.parse(sessionStorage.getItem(KEY));
      if (s && s.roster) return s;
    } catch (e) {}
    return fresh();
  }
  var state = load();
  function save() {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }
  function emit(evt) {
    listeners.forEach(function (fn) {
      fn(evt);
    });
  }

  function player(id) {
    return D.players.filter(function (p) {
      return p.id === id;
    })[0];
  }

  function slots() {
    var left = state.roster.map(player);
    return D.slots.map(function (pos) {
      var i = left.findIndex(function (p) {
        return p && p.position === pos;
      });
      var p = i >= 0 ? left.splice(i, 1)[0] : null;
      return { position: pos, player: p };
    });
  }
  function count() {
    return state.roster.length;
  }
  function isFull() {
    return count() === D.slots.length;
  }
  function freeSlots(pos) {
    return slots().filter(function (s) {
      return s.position === pos && !s.player;
    }).length;
  }
  function pendingFor(pos) {
    return Object.keys(state.invites).filter(function (id) {
      return (
        state.invites[id].status === "pending" && player(id).position === pos
      );
    }).length;
  }

  function openFor(pos) {
    return Math.max(0, freeSlots(pos) - pendingFor(pos));
  }
  function vacantPositions() {
    return slots()
      .filter(function (s) {
        return !s.player;
      })
      .map(function (s) {
        return s.position;
      });
  }
  function inviteOf(id) {
    return state.invites[id] || null;
  }

  function invite(id) {
    var p = player(id);
    if (!p || openFor(p.position) === 0 || state.roster.indexOf(id) >= 0)
      return false;
    var delay = 2500 + Math.round(Math.random() * 2000);
    state.invites[id] = { status: "pending", due: Date.now() + delay };
    save();
    emit({ type: "invite", player: p });
    schedule(id);
    return true;
  }
  function schedule(id) {
    var inv = state.invites[id];
    if (!inv || inv.status !== "pending" || timers[id]) return;
    timers[id] = setTimeout(
      function () {
        respond(id);
      },
      Math.max(300, inv.due - Date.now()),
    );
  }
  function respond(id) {
    delete timers[id];
    state = load(); // інша вкладка могла змінити стан
    var inv = state.invites[id],
      p = player(id);
    if (!inv || inv.status !== "pending") return;
    if (p.declines || freeSlots(p.position) === 0) {
      inv.status = "declined";
      state.events.unshift({ type: "declined", id: id, at: Date.now() });
    } else {
      inv.status = "accepted";
      state.roster.push(id);
      state.events.unshift({ type: "accepted", id: id, at: Date.now() });
    }
    save();
    emit({ type: inv.status, player: p });
  }

  function submitApplication() {
    if (!isFull() || state.application) return false;
    state.application = { status: "review", at: Date.now() };
    state.events.unshift({ type: "submitted", at: Date.now() });
    save();
    emit({ type: "submitted" });
    scheduleApproval();
    return true;
  }
  function scheduleApproval() {
    if (
      !state.application ||
      state.application.status !== "review" ||
      timers.app
    )
      return;
    timers.app = setTimeout(
      function () {
        delete timers.app;
        state = load();
        if (!state.application) return;
        state.application.status = "approved";
        state.events.unshift({ type: "approved", at: Date.now() });
        save();
        emit({ type: "approved" });
      },
      Math.max(300, state.application.at + 6000 - Date.now()),
    );
  }

  function reset() {
    try {
      sessionStorage.removeItem(KEY);
    } catch (e) {}
    state = fresh();
  }

  // Після переходу між сторінками відновлюємо незавершені очікування
  Object.keys(state.invites).forEach(schedule);
  scheduleApproval();

  return {
    data: D,
    player: player,
    slots: slots,
    count: count,
    isFull: isFull,
    freeSlots: freeSlots,
    pendingFor: pendingFor,
    openFor: openFor,
    vacantPositions: vacantPositions,
    inviteOf: inviteOf,
    invite: invite,
    submitApplication: submitApplication,
    reset: reset,
    get application() {
      return state.application;
    },
    get events() {
      return state.events;
    },
    get roster() {
      return state.roster;
    },
    on: function (fn) {
      listeners.push(fn);
    },
  };
})();
