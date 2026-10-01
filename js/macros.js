// A tiny version of MacroMaxx's Today screen. Missing nutrients stay unknown
// (null) instead of becoming zero, unless you flip the switch to see the difference.
(function () {
  var root = document.querySelector("[data-macros]");
  if (!root) return;
  var GOALS = { kcal: 1600, protein: 150, carbs: 150 };
  var FOODS = [
    { id: "yogurt", name: "Greek yogurt", serving: "170 g", kcal: 100, protein: 17, carbs: 6, fat: 0.7, fiber: 0 },
    { id: "chicken", name: "Chicken breast", serving: "120 g", kcal: 198, protein: 37, carbs: 0, fat: 4.3, fiber: 0 },
    { id: "banana", name: "Banana", serving: "1 medium", kcal: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1 },
    { id: "rice", name: "White rice", serving: "1 cup", kcal: 205, protein: 4.3, carbs: 45, fat: 0.4, fiber: 0.6 },
    { id: "bar", name: "Granola bar", serving: "1 bar", kcal: 190, protein: 4, carbs: 29, fat: 7, fiber: null }
  ];
  var log = [];
  var zeroSwitch = root.querySelector("[data-zero]");
  var list = root.querySelector("[data-log]");
  var C = 2 * Math.PI;

  root.querySelector("[data-foods]").innerHTML = FOODS.map(function (f) {
    return '<button type="button" class="mm-food" data-add="' + f.id + '"><span>' + f.name + '</span><small>' + f.serving +
      (f.fiber === null ? " · no fiber listed" : "") + '</small></button>';
  }).join("");

  function setRing(name, value, goal) {
    var ring = root.querySelector('[data-ring="' + name + '"]');
    var r = +ring.getAttribute("r"), len = C * r;
    var frac = Math.min(1, value / goal);
    ring.style.strokeDasharray = len;
    ring.style.strokeDashoffset = len * (1 - frac);
  }
  function fmt(n) { return (Math.round(n * 10) / 10).toLocaleString(); }

  function render() {
    var t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }, unknownFiber = [];
    log.forEach(function (f) {
      t.kcal += f.kcal; t.protein += f.protein; t.carbs += f.carbs; t.fat += f.fat;
      if (f.fiber === null) { if (zeroSwitch.checked) t.fiber += 0; else unknownFiber.push(f.name); }
      else t.fiber += f.fiber;
    });
    setRing("kcal", t.kcal, GOALS.kcal);
    setRing("protein", t.protein, GOALS.protein);
    setRing("carbs", t.carbs, GOALS.carbs);
    var left = GOALS.kcal - t.kcal;
    root.querySelector("[data-kcal]").textContent = Math.abs(Math.round(left)).toLocaleString();
    root.querySelector("[data-kcal-label]").textContent = left >= 0 ? "kcal left" : "kcal over";
    root.querySelector("[data-protein]").textContent = fmt(t.protein);
    root.querySelector("[data-carbs]").textContent = fmt(t.carbs);
    root.querySelector("[data-fat]").textContent = fmt(t.fat) + " g";
    var fiberEl = root.querySelector("[data-fiber]"), note = root.querySelector("[data-note]");
    if (unknownFiber.length) {
      fiberEl.textContent = t.fiber > 0 ? "≥ " + fmt(t.fiber) + " g" : "Unknown";
      note.textContent = t.fiber > 0
        ? "The granola bar's label doesn't list fiber, so " + fmt(t.fiber) + " g is only what we know for sure. The real total is higher."
        : "The granola bar's label doesn't list fiber, so the total is unknown. Showing 0 g here would be a guess.";
      note.className = "mm-note is-warn";
    } else if (zeroSwitch.checked && log.some(function (f) { return f.fiber === null; })) {
      fiberEl.textContent = fmt(t.fiber) + " g";
      note.textContent = "Looks complete, but it isn't. The granola bar's missing fiber was counted as 0 g.";
      note.className = "mm-note is-bad";
    } else {
      fiberEl.textContent = fmt(t.fiber) + " g";
      note.textContent = log.length ? "Every food here lists its fiber, so this total is complete." : "Tap a food to log it. Try the granola bar.";
      note.className = "mm-note";
    }
    list.innerHTML = log.map(function (f, i) {
      return '<li><span>' + f.name + '</span><span class="mm-kcal">' + f.kcal + ' kcal</span><button type="button" data-remove="' + i + '" aria-label="Remove ' + f.name + '">×</button></li>';
    }).join("");
    root.querySelector("[data-empty]").hidden = log.length > 0;
  }

  root.addEventListener("click", function (e) {
    var add = e.target.closest("[data-add]"), rm = e.target.closest("[data-remove]");
    if (add) { log.push(FOODS.filter(function (f) { return f.id === add.getAttribute("data-add"); })[0]); render(); }
    if (rm) { log.splice(+rm.getAttribute("data-remove"), 1); render(); }
    if (e.target.closest("[data-clear]")) { log = []; render(); }
  });
  zeroSwitch.addEventListener("change", render);
  render();
})();
