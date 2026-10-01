// E.V.I.E.'s floating planet, ported from SaturnView.swift to canvas.
// Same geometry, colors and orbit math as the Mac app. The tools here are pretend.
(function () {
  var ICE = [145, 204, 252], WARN = [255, 189, 102], ORANGE = [255, 149, 0];
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  function orbitPoint(angle, radius, flatten) {
    var tilt = -0.43, x = Math.cos(angle) * radius, y = Math.sin(angle) * radius * flatten;
    return { x: x * Math.cos(tilt) - y * Math.sin(tilt), y: x * Math.sin(tilt) + y * Math.cos(tilt) };
  }

  function mount(root) {
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    root.prepend(canvas);
    var ctx = canvas.getContext("2d");
    var model = { busy: false, listening: false, speaking: false, approval: null, moons: [], level: 0 };
    var statusEl = root.querySelector("[data-status]");
    var card = root.querySelector("[data-approval]");
    var visible = true, start = performance.now();

    function size() {
      var px = canvas.clientWidth || 216, dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = canvas.height = Math.round(px * dpr);
      ctx.setTransform(canvas.width / 108, 0, 0, canvas.height / 108, 0, 0);
    }

    function activity() {
      if (model.approval) return "Needs your approval";
      if (model.listening) return "Listening";
      if (model.speaking) return "Speaking";
      if (model.moons.some(function (m) { return m.phase === "running"; })) return "Working";
      return "Ready";
    }

    function draw(now) {
      var seconds = reduce ? 0 : (now - start) / 1000;
      var phase = seconds * 0.20;
      ctx.clearRect(0, 0, 108, 108);
      var cx = 54, cy = 54;
      var attention = !!model.approval;
      var ring = attention ? WARN : ICE;
      if (model.listening) model.level = 0.25 + 0.2 * Math.abs(Math.sin(seconds * 7.3) * Math.sin(seconds * 2.1));
      var voicePulse = model.listening ? Math.min(1, Math.sqrt(model.level) * 3) : 0;
      var speakingPulse = model.speaking && seconds ? (Math.sin(seconds * 4.3) + 1) / 2 : 0;
      var pulse = Math.max(voicePulse, speakingPulse * 0.65);
      var radius = 31 + pulse * 2.3;
      var flatten = 0.36 + (seconds ? Math.sin(phase * 0.37) * 0.055 : 0);
      var busy = activity() === "Working";

      function pt(a, r) { var p = orbitPoint(a, r, flatten); return { x: p.x + cx, y: p.y + cy }; }
      function drawRing(front) {
        var rot = phase * (busy ? 2.1 : 1), light = pt(rot, radius), dark = pt(rot + Math.PI, radius);
        for (var band = 0; band < 3; band++) {
          var r = radius - band * 2.1;
          ctx.beginPath();
          for (var s = 0; s <= 32; s++) {
            var a = s / 32 * Math.PI + (front ? 0 : Math.PI), p = pt(a, r);
            if (s === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
          }
          var g = ctx.createLinearGradient(light.x, light.y, dark.x, dark.y);
          g.addColorStop(0, rgba(ring, front ? 0.96 : 0.65));
          g.addColorStop(1, rgba(ring, front ? 0.40 : 0.20));
          ctx.strokeStyle = g; ctx.lineWidth = band === 0 ? 1.7 : 0.8; ctx.lineCap = "round";
          ctx.stroke();
        }
      }

      drawRing(false);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.22)"; ctx.shadowBlur = 3; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 3;
      var sg = ctx.createRadialGradient(cx - 6, cy - 7, 0, cx - 6, cy - 7, 30);
      sg.addColorStop(0, "rgb(219,240,255)"); sg.addColorStop(1 / 3, rgba(ICE, 1));
      sg.addColorStop(2 / 3, "rgb(41,87,153)"); sg.addColorStop(1, "rgb(18,38,74)");
      ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fillStyle = sg; ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = "rgba(255,255,255,0.11)"; ctx.lineWidth = 1.2;
      for (var i = -2; i <= 2; i++) {
        var y = cy + i * 4.8;
        ctx.beginPath(); ctx.moveTo(cx - 17, y - 2);
        ctx.quadraticCurveTo(cx + Math.sin(phase) * 6, y + 6, cx + 17, y + 2); ctx.stroke();
      }
      ctx.restore();
      drawRing(true);
      if (model.listening || model.speaking) {
        ctx.beginPath(); ctx.arc(cx, cy, 17 + pulse * 3, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(ring, 0.08 + pulse * 0.13); ctx.lineWidth = 1; ctx.stroke();
      }

      // Moons: one per unit of work, never decorative.
      model.moons = model.moons.filter(function (m) { return !m.endedAt || now - m.endedAt < 2000; });
      model.moons.slice(0, 6).forEach(function (m, index) {
        var orbitTime = m.phase === "waiting" && !reduce ? (m.waitingAt - start) / 1000 : seconds;
        var angle = orbitTime * 0.38 + index * 1.047;
        var finishing = m.endedAt ? Math.max(0, Math.min(1, (now - m.endedAt) / 2000)) : 0;
        var p = orbitPoint(angle, 44 * (reduce ? 1 : 1 - finishing * 0.72), 0.67);
        ctx.save();
        ctx.globalAlpha = reduce ? (m.endedAt ? 0 : 1) : 1 - finishing;
        ctx.shadowColor = rgba(ICE, 0.4); ctx.shadowBlur = 3;
        ctx.beginPath(); ctx.arc(cx + p.x, cy + p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = m.phase === "waiting" || m.phase === "failed" ? rgba(ORANGE, 1) : rgba(ICE, 1);
        ctx.fill();
        ctx.shadowBlur = 0; ctx.lineWidth = 0.6; ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.stroke();
        ctx.restore();
      });
      if (statusEl) statusEl.textContent = activity();
    }

    function loop(now) {
      if (visible) draw(now);
      if (!reduce) requestAnimationFrame(loop);
    }

    function addMoon(title, phase) {
      var m = { title: title, phase: phase || "running", startedAt: performance.now() };
      if (m.phase === "waiting") m.waitingAt = m.startedAt;
      model.moons.push(m);
      return m;
    }
    function finish(m, failed) {
      m.phase = failed ? "failed" : "finished";
      m.endedAt = performance.now();
      if (reduce) setTimeout(function () { draw(performance.now()); }, 2100);
    }
    function refresh() { if (reduce) draw(performance.now()); }

    var actions = {
      tool: function () {
        var names = ["Search files", "Open Safari", "Read a page", "Check the time"];
        var m = addMoon(names[Math.floor(Math.random() * names.length)]);
        setTimeout(function () { finish(m); refresh(); }, 2200 + Math.random() * 1800);
      },
      approve: function () {
        if (model.approval) return;
        var m = addMoon("Save a skill", "waiting");
        model.approval = m;
        if (card) card.hidden = false;
      },
      allow: function () {
        var m = model.approval; if (!m) return;
        model.approval = null; if (card) card.hidden = true;
        m.phase = "running"; m.waitingAt = null;
        setTimeout(function () { finish(m); refresh(); }, 1400);
      },
      deny: function () {
        var m = model.approval; if (!m) return;
        model.approval = null; if (card) card.hidden = true;
        finish(m, true);
      },
      talk: function () {
        if (model.listening || model.speaking) return;
        model.listening = true; refresh();
        setTimeout(function () { model.listening = false; model.speaking = true; refresh(); }, 2600);
        setTimeout(function () { model.speaking = false; refresh(); }, 4800);
      }
    };
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (b && actions[b.getAttribute("data-act")]) { actions[b.getAttribute("data-act")](); refresh(); }
    });

    // The homepage copy has no buttons, so it runs a couple of tools on its own.
    if (root.hasAttribute("data-auto")) {
      addMoon("Search files"); addMoon("Open Safari");
      if (!reduce) setInterval(function () {
        if (!visible) return;
        var running = model.moons.filter(function (m) { return !m.endedAt; });
        if (running.length > 1) finish(running[0]); else actions.tool();
      }, 3200);
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(root);
    }
    window.addEventListener("resize", function () { size(); refresh(); });
    size();
    if (reduce) draw(performance.now()); else requestAnimationFrame(loop);
  }

  document.querySelectorAll("[data-saturn]").forEach(mount);
})();
