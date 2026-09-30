// Fade sections in as they scroll into view. Content stays visible without JS
// or when the viewer prefers reduced motion.
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) return;

  var items = document.querySelectorAll("[data-reveal]");
  document.documentElement.classList.add("reveal-ready");

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      io.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  items.forEach(function (el) { io.observe(el); });
})();
