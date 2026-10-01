// A* on a made-up campus, the same idea ClassPath uses for real routes.
// Nodes are doors and path corners; edge cost is walking distance.
(function () {
  var root = document.querySelector("[data-route]");
  if (!root) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var METERS_PER_UNIT = 1.6, WALK_M_PER_MIN = 80;

  var nodes = {
    dorms: [70, 330, "Dorms"], dining: [230, 362, "Dining hall"], library: [330, 205, "Library"],
    science: [565, 92, "Science"], arts: [548, 322, "Arts"], gym: [86, 88, "Gym"], lecture: [360, 58, "Lecture hall"],
    k1: [150, 268], k2: [252, 292], k3: [210, 158], k4: [432, 270], k5: [462, 168], k6: [392, 342], k7: [232, 70], k8: [502, 228]
  };
  var edges = [
    ["dorms", "k1"], ["dorms", "dining"], ["k1", "k2"], ["k1", "k3"], ["gym", "k3"], ["gym", "k7"], ["k3", "k7"],
    ["k7", "lecture"], ["k3", "library"], ["k2", "library"], ["k2", "dining"], ["dining", "k6"], ["k6", "k4"],
    ["k2", "k6"], ["library", "k4"], ["library", "k5"], ["lecture", "k5"], ["k5", "science"], ["k5", "k8"],
    ["k8", "science"], ["k8", "arts"], ["k4", "k8"], ["k6", "arts"], ["k4", "arts"]
  ];
  var closed = {};
  var ids = Object.keys(nodes);
  var buildings = ids.filter(function (id) { return nodes[id][2]; });
  function key(a, b) { return a < b ? a + "|" + b : b + "|" + a; }
  function dist(a, b) { var p = nodes[a], q = nodes[b]; return Math.hypot(p[0] - q[0], p[1] - q[1]); }
  function neighbors(id) {
    var out = [];
    edges.forEach(function (e) {
      if (closed[key(e[0], e[1])]) return;
      if (e[0] === id) out.push(e[1]); else if (e[1] === id) out.push(e[0]);
    });
    return out;
  }

  // A* search. With useGuess off it's Dijkstra's algorithm, for comparison.
  function search(from, to, useGuess) {
    var g = {}, came = {}, open = [from], seen = {}, events = [];
    g[from] = 0;
    function f(id) { return g[id] + (useGuess ? dist(id, to) : 0); }
    events.push({ type: "open", id: from });
    while (open.length) {
      open.sort(function (a, b) { return f(a) - f(b); });
      var cur = open.shift();
      if (seen[cur]) continue;
      seen[cur] = true;
      events.push({ type: "close", id: cur });
      if (cur === to) break;
      neighbors(cur).forEach(function (n) {
        if (seen[n]) return;
        var tentative = g[cur] + dist(cur, n);
        if (g[n] === undefined || tentative < g[n]) {
          g[n] = tentative; came[n] = cur; open.push(n);
          events.push({ type: "open", id: n });
        }
      });
    }
    if (!seen[to]) return { events: events, path: null, checked: Object.keys(seen).length };
    var path = [to];
    while (path[0] !== from) path.unshift(came[path[0]]);
    return { events: events, path: path, length: g[to], checked: Object.keys(seen).length };
  }

  // Build the map.
  var NS = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 640 400");
  svg.setAttribute("class", "rt-map");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "A made-up campus map with seven buildings connected by walkways.");
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(e);
    return e;
  }
  var gEdges = el("g", {}), gPath = el("g", {}), gHits = el("g", {}), gNodes = el("g", {});
  var edgeEls = {}, nodeEls = {};
  edges.forEach(function (e) {
    var a = nodes[e[0]], b = nodes[e[1]], k = key(e[0], e[1]);
    edgeEls[k] = el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: "rt-edge" }, gEdges);
    var hit = el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: "rt-hit" }, gHits);
    hit.addEventListener("click", function () { toggleEdge(k); });
  });
  var pathLine = el("polyline", { class: "rt-path", points: "" }, gPath);
  ids.forEach(function (id) {
    var n = nodes[id];
    var group = el("g", { class: n[2] ? "rt-node rt-building" : "rt-node" }, gNodes);
    el("circle", { cx: n[0], cy: n[1], r: n[2] ? 9 : 4.5 }, group);
    if (n[2]) {
      var right = n[0] > 470, below = n[1] < 120;
      el("text", { x: n[0] + (right ? -14 : 14), y: n[1] + (below ? 24 : -12), "text-anchor": right ? "end" : "start" }, group).textContent = n[2];
      group.addEventListener("click", function () { toSel.value = id; run(); });
    }
    nodeEls[id] = group;
  });
  root.querySelector("[data-map]").appendChild(svg);

  var fromSel = root.querySelector("[data-from]"), toSel = root.querySelector("[data-to]");
  var timeIn = root.querySelector("[data-class-time]"), out = root.querySelector("[data-out]");
  var compare = root.querySelector("[data-compare]"), slow = root.querySelector("[data-slow]");
  buildings.forEach(function (id) {
    fromSel.add(new Option(nodes[id][2], id));
    toSel.add(new Option(nodes[id][2], id));
  });
  fromSel.value = "dorms"; toSel.value = "science";
  if (reduce) slow.checked = false;

  var timer = null;
  function clearMarks() {
    ids.forEach(function (id) { nodeEls[id].classList.remove("is-open", "is-closed", "is-from", "is-to"); });
    pathLine.setAttribute("points", "");
  }
  function leaveBy(minutes) {
    var parts = (timeIn.value || "10:00").split(":"), t = (+parts[0]) * 60 + (+parts[1]) - minutes;
    t = (t + 1440) % 1440;
    var h = Math.floor(t / 60), m = t % 60, h12 = h % 12 || 12;
    return h12 + ":" + String(m).padStart(2, "0") + (h < 12 ? " am" : " pm");
  }
  function finish(result, from, to) {
    if (!result.path) {
      out.textContent = "There's no open way from " + nodes[from][2] + " to " + nodes[to][2] + ". Reopen a path and try again.";
      compare.textContent = "";
      return;
    }
    pathLine.setAttribute("points", result.path.map(function (id) { return nodes[id][0] + "," + nodes[id][1]; }).join(" "));
    var meters = result.length * METERS_PER_UNIT, minutes = Math.ceil(meters / WALK_M_PER_MIN);
    out.textContent = nodes[from][2] + " to " + nodes[to][2] + ": " + Math.round(meters / 10) * 10 + " m, about " +
      minutes + " min. Leave by " + leaveBy(minutes) + ".";
    var dijkstra = search(from, to, false);
    compare.textContent = "A* checked " + result.checked + " of " + ids.length + " points. Without its straight-line guess, it would have checked " + dijkstra.checked + ".";
  }
  function run() {
    clearTimeout(timer);
    clearMarks();
    var from = fromSel.value, to = toSel.value;
    nodeEls[from].classList.add("is-from"); nodeEls[to].classList.add("is-to");
    if (from === to) { out.textContent = "You're already there."; compare.textContent = ""; return; }
    var result = search(from, to, true);
    if (!slow.checked) {
      result.events.forEach(function (ev) { nodeEls[ev.id].classList.add(ev.type === "close" ? "is-closed" : "is-open"); });
      finish(result, from, to);
      return;
    }
    out.textContent = "Searching…"; compare.textContent = "";
    var i = 0;
    (function tick() {
      var ev = result.events[i++];
      if (!ev) { finish(result, from, to); return; }
      var node = nodeEls[ev.id];
      if (ev.type === "close") { node.classList.remove("is-open"); node.classList.add("is-closed"); }
      else if (!node.classList.contains("is-closed")) node.classList.add("is-open");
      timer = setTimeout(tick, ev.type === "close" ? 260 : 90);
    })();
  }
  function toggleEdge(k) {
    closed[k] = !closed[k];
    edgeEls[k].classList.toggle("is-blocked", !!closed[k]);
    var saved = slow.checked; slow.checked = false; run(); slow.checked = saved;
  }

  root.querySelector("[data-run]").addEventListener("click", run);
  root.querySelector("[data-reopen]").addEventListener("click", function () {
    closed = {}; Object.keys(edgeEls).forEach(function (k) { edgeEls[k].classList.remove("is-blocked"); });
    run();
  });
  [fromSel, toSel].forEach(function (s) { s.addEventListener("change", run); });
  timeIn.addEventListener("change", function () { var s = slow.checked; slow.checked = false; run(); slow.checked = s; });
  var s0 = slow.checked; slow.checked = false; run(); slow.checked = s0;
})();
