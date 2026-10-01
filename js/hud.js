// A working copy of the SpotiHUD desktop overlay, playing made-up songs.
// The styles are the real overlay's (see .sh-* in style.css); playback is faked.
(function () {
  var THEMES = ["aurora", "mint", "ember", "tide", "rose", "amber", "mono"];
  var TRACKS = [
    { title: "Late Night Drive", artist: "Sample Artist", duration: 214, art: "linear-gradient(135deg,#7b5cff,#43d9c4 55%,#ff6fa3)" },
    { title: "Quiet Hours", artist: "Sample Artist", duration: 187, art: "linear-gradient(160deg,#f6b26b,#e8657a 50%,#5b3b8c)" },
    { title: "Slow Orbit", artist: "Sample Artist", duration: 241, art: "linear-gradient(200deg,#4fc3f7,#1a3a5c 60%,#0b1a2a)" }
  ];
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function icon(path, size) {
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="currentColor" aria-hidden="true"><path d="' + path + '"/></svg>';
  }
  var PLAY = "M8 5v14l11-7z", PAUSE = "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z";

  function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

  function mount(root) {
    var interactive = root.hasAttribute("data-controls");
    root.innerHTML =
      '<div class="sh-hud sh-theme-aurora sh-playing">' +
        '<div class="sh-art"></div>' +
        '<div class="sh-meta">' +
          '<div class="sh-bars" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>' +
          '<div class="sh-title"></div><div class="sh-artist"></div>' +
          '<div class="sh-progress"><div class="sh-track"><div class="sh-fill"></div></div>' +
          '<div class="sh-times"><span class="sh-pos">0:00</span><span class="sh-dur">0:00</span></div></div>' +
        '</div>' +
        '<div class="sh-controls">' +
          '<button type="button" data-act="prev" aria-label="Previous song">' + icon("M6 6h2v12H6zM9.5 12l8.5 6V6z", 16) + '</button>' +
          '<button type="button" data-act="play" class="sh-big" aria-label="Pause">' + icon(PAUSE, 20) + '</button>' +
          '<button type="button" data-act="next" aria-label="Next song">' + icon("M16 6h2v12h-2zM6 6l8.5 6L6 18z", 16) + '</button>' +
        '</div>' +
      '</div>';

    var hud = root.querySelector(".sh-hud");
    var q = function (s) { return root.querySelector(s); };
    var state = { track: 0, pos: 83, playing: !reduce, theme: 0 };
    if (!interactive) { root.querySelectorAll("button").forEach(function (b) { b.tabIndex = -1; }); }

    function render() {
      var t = TRACKS[state.track];
      q(".sh-title").textContent = t.title;
      q(".sh-artist").textContent = t.artist;
      q(".sh-art").style.background = t.art;
      q(".sh-dur").textContent = fmt(t.duration);
      q(".sh-pos").textContent = fmt(state.pos);
      q(".sh-fill").style.width = (state.pos / t.duration * 100) + "%";
      hud.classList.toggle("sh-playing", state.playing);
      var play = q('[data-act="play"]');
      play.innerHTML = icon(state.playing ? PAUSE : PLAY, 20);
      play.setAttribute("aria-label", state.playing ? "Pause" : "Play");
      THEMES.forEach(function (n) { hud.classList.remove("sh-theme-" + n); });
      hud.classList.add("sh-theme-" + THEMES[state.theme]);
      var label = document.querySelector('[data-hud-theme="' + root.id + '"]');
      if (label) label.textContent = THEMES[state.theme];
    }

    function step(dir) {
      state.track = (state.track + dir + TRACKS.length) % TRACKS.length;
      state.pos = 0;
      render();
    }
    function cycleTheme() { state.theme = (state.theme + 1) % THEMES.length; render(); }

    root.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b || !interactive) return;
      var act = b.getAttribute("data-act");
      if (act === "play") { state.playing = !state.playing; render(); }
      if (act === "next") step(1);
      if (act === "prev") step(-1);
    });
    root.addEventListener("contextmenu", function (e) { if (interactive) { e.preventDefault(); cycleTheme(); } });
    if (interactive) {
      window.addEventListener("keydown", function (e) {
        if (e.target.closest && e.target.closest("input, textarea, select")) return;
        if (e.key === "t" || e.key === "T") cycleTheme();
      });
      document.querySelectorAll('[data-hud-cycle="' + root.id + '"]').forEach(function (b) {
        b.addEventListener("click", cycleTheme);
      });
    }

    // Only tick while the overlay is on screen.
    var visible = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(root);
    }
    var auto = root.hasAttribute("data-auto-theme");
    var ticks = 0;
    setInterval(function () {
      if (!visible || !state.playing) return;
      state.pos += 0.25;
      if (state.pos >= TRACKS[state.track].duration) step(1);
      ticks++;
      if (auto && !reduce && ticks % 24 === 0) state.theme = (state.theme + 1) % THEMES.length;
      render();
    }, 250);
    render();
  }

  document.querySelectorAll("[data-hud]").forEach(mount);
})();
